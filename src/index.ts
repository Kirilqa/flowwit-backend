import dotenv from 'dotenv'
import { getErrorMessage, stripUndefined } from '@core/utils'
import { PinoLogger } from '@logger'
import { loadConfig } from '@config'
import { BackendServer } from './api'
import { AgentDispatcher } from '@agent/dispatcher'
import { AgentCommand, CommandAwareAgentDispatcher, CommandRegistry, CommandResolver, WorkFlowCommand } from '@command'
import { AgentSessionEventBus, WebChannel, ConsoleChannel } from '@channel'
import { TelegramChannel, JsonTelegramChatStateRepository } from './channels/telegram'
import { ChannelRegistry, ChannelConfigUpdater, ChannelConfigResolver, JsonChannelConfigRepository } from '@channel'
import {
    AgentConfigRegistryDependencies,
    AgentDependencies,
    createAgentFactory,
    createDefaultAgents,
    createRawAgentFactory
} from '@agent'
import { FileMemoryRepository, Memory } from '@memory'
import { Budget, BudgetFactory } from '@agent/budget'
import {
    GuardrailRegistry,
    GuardrailResolverAggregator,
    GuardrailRulesStore,
    JsonGuardrailRulesRepository,
    ShellCommandGuardrail,
    ToolPermissionGuardrail
} from '@guardrail'
import {
    JsonMCPServerConfigRepository,
    MCPClient,
    MCPClientFactory,
    MCPConfigUpdater,
    MCPConnectionManager,
    MCPServerConfig,
    MCPServerRegistry
} from '@mcp'
import { LoggerObservability } from '@observability'
import { AgentRegistry } from '@agent/registries'
import { JsonRawAgentConfigRepository } from '@agent/repositories'
import {
    JsonSessionRepository,
    Session,
    SessionFactory,
    SessionManager,
    SessionOptimizerInterface,
    SessionSummarizer,
    ToolCallCompressor
} from '@session'
import {
    DEFAULT_SKILLS,
    MarkdownSkillRepository,
    NoopSkillSafetyInspector,
    SafetyCheckedSkillRepository,
    SkillRegistry,
    SkillsUpdater
} from '@skill'
import { PlanAndExecuteStrategy, ReActStrategy, ThinkingStrategyRegistry } from '@strategy'
import { StructuredOutputExtractor } from '@agent/structured'
import { ToolOrchestrator } from '@agent/toolOrchestrator'
import {
    createAgentTools,
    CreateAgentToolsDependencies,
    createBrowserTools,
    createFileSystemTools,
    createMCPTools,
    createMemoryTools,
    createSkillTools,
    DoneTool,
    ExecuteCommandTool,
    HttpRequestTool,
    HumanInputTool,
    ToolInterface,
    ToolRegistry,
    createSchedulerTools,
    CreateSchedulerToolsDependencies,
    createWorkFlowTools,
    CreateWorkFlowToolsDependencies,
    createChannelTools,
    CreateChannelToolsDependencies
} from '@tool'
import { createClawHubTools, createTypeScriptTools } from './tools'
import { AgentConfigUpdater } from '@agent/updaters'
import { ProviderInterface, ProviderRegistry } from '@provider'
import { FileWatcher } from '@watcher/implementations/FileWatcher'
import {
    AgentNode,
    ConditionNode,
    DelayNode,
    ForLoopNode,
    HttpRequestNode,
    InputNode,
    JsonParseNode,
    JsonStringifyNode,
    LLMNode,
    MCPToolNode,
    MergeNode,
    RaceNode,
    SkillNode,
    ToolNode,
    TransformNode,
    WhileLoopNode,
    WorkFlowNodeRegistry,
    WorkFlowRegistry,
    JsonWorkFlowRepository
} from '@workflow'
import { OpenAIProvider, OpenAIProviderOptions } from './providers/openai'
import { OpenRouterProvider, OpenRouterProviderOptions } from './providers/openrouter'
import { OllamaProvider } from './providers/ollama'
import { LMStudioProvider, LMStudioProviderOptions } from './providers/lmstudio'
import { RUN_MODE } from './types'
import { parseRunMode } from './utils'
import { JsonWorkFlowRunRepository, WorkFlowRunner, WorkFlowUpdater } from '@workflow'
import {
    JsonScheduledTaskRepository,
    JsonScheduledTaskRunRepository,
    Scheduler,
    ScheduledTaskRegistry,
    ScheduledTaskUpdater
} from '@scheduler'

dotenv.config()

const logger = PinoLogger.create()

logger.info('Starting', { cwd: process.cwd() })
;(async () => {
    const appConfig = loadConfig()

    const skillSafetyInspector = new NoopSkillSafetyInspector()
    const skillRepository = new SafetyCheckedSkillRepository(
        new MarkdownSkillRepository(appConfig.paths.skills),
        skillSafetyInspector
    )
    await skillRepository.ensureInitialized(DEFAULT_SKILLS)

    const mcpConfigRepository = new JsonMCPServerConfigRepository(appConfig.paths.mcpConfig)
    await mcpConfigRepository.ensureInitialized()

    const memoryRepository = new FileMemoryRepository(appConfig.memory.path)
    await memoryRepository.ensureInitialized()

    const mcpConnectionManager = new MCPConnectionManager(logger)

    const sessionFactory: SessionFactory = (sessionId, options) => new Session(sessionId, optimizers, options)

    const sessionRepository = new JsonSessionRepository(appConfig.paths.sessions, sessionFactory)
    await sessionRepository.ensureInitialized()

    const providerRegistry = new ProviderRegistry()
    const agentRegistry = new AgentRegistry()
    const skillRegistry = new SkillRegistry()
    const toolRegistry = new ToolRegistry()
    const thinkingStrategyRegistry = new ThinkingStrategyRegistry()
    const mcpServerRegistry = new MCPServerRegistry(mcpConnectionManager)
    const workflowRegistry = new WorkFlowRegistry()
    const workflowNodeRegistry = new WorkFlowNodeRegistry()

    const mcpFactory: MCPClientFactory = (config: MCPServerConfig) => new MCPClient(config.name, config)

    const providerCandidates: Array<ProviderInterface> = []

    if (appConfig.openai.apiKey !== undefined) {
        const openAiProvider = new OpenAIProvider(
            appConfig.openai.apiKey,
            stripUndefined({
                baseUrl: appConfig.openai.baseUrl,
                organization: appConfig.openai.organization,
                project: appConfig.openai.project
            }) as OpenAIProviderOptions
        )
        providerCandidates.push(openAiProvider)
    }

    if (appConfig.openrouter.apiKey !== undefined) {
        const openRouterProvider = new OpenRouterProvider(
            appConfig.openrouter.apiKey,
            stripUndefined({
                baseUrl: appConfig.openrouter.baseUrl,
                httpReferer: appConfig.openrouter.httpReferer,
                title: appConfig.openrouter.title
            }) as OpenRouterProviderOptions
        )
        providerCandidates.push(openRouterProvider)
    }

    if (appConfig.ollama.baseUrl !== undefined) {
        providerCandidates.push(new OllamaProvider({ baseUrl: appConfig.ollama.baseUrl }))
    }

    if (appConfig.lmstudio.baseUrl !== undefined) {
        providerCandidates.push(
            new LMStudioProvider(
                stripUndefined({
                    baseUrl: appConfig.lmstudio.baseUrl,
                    apiKey: appConfig.lmstudio.apiKey
                }) as LMStudioProviderOptions
            )
        )
    }

    const providerInitResults = await Promise.allSettled(providerCandidates.map(provider => provider.initialize()))

    providerCandidates.forEach((provider, index) => {
        const result = providerInitResults[index]
        if (result?.status === 'fulfilled') {
            providerRegistry.register(provider.name, provider)
        } else if (result?.status === 'rejected') {
            logger.warn(`Failed to initialize provider "${provider.name}"`, { error: getErrorMessage(result.reason) })
        }
    })

    if (providerRegistry.list().length === 0) {
        throw new Error('No working providers available: all configured providers failed to initialize')
    }

    logger.info('Providers initialized', { count: providerRegistry.list().length })

    const defaultAgents = await createDefaultAgents(providerRegistry.list())

    const toolCallCompressor = new ToolCallCompressor()
    const contextSummarizer = new SessionSummarizer()

    const optimizers: Array<SessionOptimizerInterface> = [toolCallCompressor, contextSummarizer]

    const sessionManager = new SessionManager(sessionRepository, sessionFactory)
    await sessionManager.initialize()
    logger.info('Session manager initialized')

    const doneTool = new DoneTool()
    const humanInputTool = new HumanInputTool()
    const defaultTools: Array<ToolInterface> = [doneTool, humanInputTool]

    const guardrailRulesRepository = new JsonGuardrailRulesRepository(appConfig.paths.guardrailRules)
    await guardrailRulesRepository.ensureInitialized()
    const guardrailRulesStore = new GuardrailRulesStore(guardrailRulesRepository)
    await guardrailRulesStore.initialize()
    logger.info('Guardrail rules loaded')

    const toolPermissionGuardrail = new ToolPermissionGuardrail(guardrailRulesStore, defaultTools)
    const shellCommandGuardrail = new ShellCommandGuardrail(guardrailRulesStore)
    const guardrailResolverAggregator = new GuardrailResolverAggregator([
        toolPermissionGuardrail,
        shellCommandGuardrail
    ])

    const guardrailRegistry = new GuardrailRegistry()
    guardrailRegistry.register(toolPermissionGuardrail.id, toolPermissionGuardrail)
    guardrailRegistry.register(shellCommandGuardrail.id, shellCommandGuardrail)

    const workflowRepository = new JsonWorkFlowRepository(appConfig.paths.workflows, workflowNodeRegistry, logger)
    await workflowRepository.ensureInitialized()

    const workflowRunRepository = new JsonWorkFlowRunRepository(
        appConfig.paths.workflowRuns,
        workflowNodeRegistry,
        logger
    )
    await workflowRunRepository.ensureInitialized()

    const workflowRunner = new WorkFlowRunner(workflowRunRepository)

    const budgetFactory: BudgetFactory = config => new Budget(config)

    const agentConfigRegistryDependencies: AgentConfigRegistryDependencies = {
        providerRegistry,
        thinkingStrategyRegistry,
        toolRegistry,
        skillRegistry,
        agentRegistry,
        mcpServerRegistry,
        workflowRegistry
    }

    const agentDependencies: AgentDependencies = {
        toolOrchestrator: new ToolOrchestrator(sessionManager, workflowRunner, defaultTools),
        guardrails: [toolPermissionGuardrail, shellCommandGuardrail],
        guardrailResolver: guardrailResolverAggregator,
        observability: new LoggerObservability(logger),
        structuredOutputExtractor: new StructuredOutputExtractor(),
        memory: new Memory(memoryRepository, appConfig.memory.persistentMaxLines, appConfig.memory.persistentMaxBytes),
        budgetFactory
    }

    const agentFactory = createAgentFactory(agentDependencies)
    const rawAgentFactory = createRawAgentFactory(
        agentConfigRegistryDependencies,
        agentFactory,
        logger,
        appConfig.userTimezone
    )

    const rawAgentConfigRepository = new JsonRawAgentConfigRepository(appConfig.paths.agentConfig, logger)
    await rawAgentConfigRepository.ensureInitialized(defaultAgents)

    const createAgentToolsDependencies: CreateAgentToolsDependencies = {
        rawAgentFactory,
        agentRegistry,
        providerRegistry,
        thinkingStrategyRegistry,
        toolRegistry,
        skillRegistry,
        mcpServerRegistry,
        workflowRegistry,
        guardrailRegistry,
        rawAgentConfigRepository
    }

    const createWorkFlowToolsDependencies: CreateWorkFlowToolsDependencies = {
        workflowRegistry,
        workflowRepository,
        workflowRunRepository,
        workflowRunner,
        workflowNodeRegistry,
        agentRegistry,
        rawAgentConfigRepository
    }

    const systemTools = [
        ...createFileSystemTools(),
        new ExecuteCommandTool(),
        new HttpRequestTool(),
        ...createBrowserTools(),
        ...createSkillTools(skillRepository, skillRegistry, agentRegistry),
        ...createMCPTools(mcpFactory, mcpConfigRepository, mcpServerRegistry, agentRegistry),
        ...createAgentTools(createAgentToolsDependencies),
        ...createWorkFlowTools(createWorkFlowToolsDependencies),
        ...createMemoryTools(memoryRepository)
    ]

    for (const tool of systemTools) {
        toolRegistry.register(tool.name, tool)
    }

    const typeScriptTools = createTypeScriptTools()

    for (const tool of typeScriptTools) {
        toolRegistry.register(tool.name, tool)
    }

    const clawHubTools = createClawHubTools(skillRepository, skillRegistry, skillSafetyInspector)

    for (const tool of clawHubTools) {
        toolRegistry.register(tool.name, tool)
    }

    logger.info('Tools registered', {
        system: systemTools.length,
        typescript: typeScriptTools.length,
        clawhub: clawHubTools.length,
        total: toolRegistry.list().length
    })

    const reActStrategy = new ReActStrategy()
    thinkingStrategyRegistry.register(reActStrategy.name, reActStrategy)

    const planAndExecuteStrategy = new PlanAndExecuteStrategy(reActStrategy)
    thinkingStrategyRegistry.register(planAndExecuteStrategy.name, planAndExecuteStrategy)

    logger.info('Thinking strategies registered', {
        strategies: [reActStrategy.name, planAndExecuteStrategy.name]
    })

    const skills = await skillRepository.findAll()
    for (const skill of skills) {
        skillRegistry.register(skill.name, skill)
    }

    logger.info('Skills loaded', { count: skills.length })

    const mcpConfigs = await mcpConfigRepository.findAll()
    for (const config of mcpConfigs) {
        const mcpClient = mcpFactory(config)
        mcpServerRegistry.register(mcpClient.alias, mcpClient)
    }

    logger.info('MCP servers registered', { count: mcpConfigs.length })

    const rawAgentConfigs = await rawAgentConfigRepository.findAll()
    let loadedAgentCount = 0

    for (const rawAgentConfig of rawAgentConfigs) {
        try {
            const agent = rawAgentFactory(rawAgentConfig)
            agentRegistry.register(agent.config.id, agent)
            loadedAgentCount++
        } catch (error) {
            logger.warn(`Failed to create agent "${rawAgentConfig.name}"`, {
                agentName: rawAgentConfig.name,
                error: getErrorMessage(error)
            })
        }
    }

    logger.info('Agents loaded', { loaded: loadedAgentCount, total: rawAgentConfigs.length })

    const workflowNodes = [
        new InputNode(),
        new DelayNode(),
        new TransformNode(),
        new ConditionNode(),
        new MergeNode(),
        new RaceNode(),
        new ForLoopNode(),
        new WhileLoopNode(),
        new JsonParseNode(),
        new JsonStringifyNode(),
        new HttpRequestNode(),
        new LLMNode(providerRegistry),
        new ToolNode(toolRegistry),
        new MCPToolNode(mcpServerRegistry),
        new SkillNode(skillRegistry),
        new AgentNode(agentRegistry, sessionManager)
    ]

    for (const node of workflowNodes) {
        workflowNodeRegistry.register(node.type, node)
    }

    logger.info('WorkFlow node types registered', { count: workflowNodes.length })

    const workflows = await workflowRepository.findAll()
    for (const workflow of workflows) {
        workflowRegistry.register(workflow.id, workflow)
    }

    logger.info('WorkFlows loaded', { count: workflows.length })

    const scheduledTaskRegistry = new ScheduledTaskRegistry()
    const scheduledTaskRepository = new JsonScheduledTaskRepository(appConfig.paths.scheduledTasks)
    await scheduledTaskRepository.ensureInitialized()

    const scheduledTaskRunRepository = new JsonScheduledTaskRunRepository(appConfig.paths.scheduledTaskRuns)
    await scheduledTaskRunRepository.ensureInitialized()

    const scheduledTasks = await scheduledTaskRepository.findAll()
    for (const task of scheduledTasks) {
        scheduledTaskRegistry.register(task.id, task)
    }

    logger.info('Scheduled tasks loaded', { count: scheduledTasks.length })

    const skillsUpdater = new SkillsUpdater(skillRepository, skillRegistry, agentRegistry)
    const mcpConfigUpdater = new MCPConfigUpdater(mcpFactory, mcpConfigRepository, mcpServerRegistry, agentRegistry)
    const agentConfigUpdater = new AgentConfigUpdater(rawAgentConfigRepository, agentRegistry, rawAgentFactory, logger)
    const workflowUpdater = new WorkFlowUpdater(workflowRepository, workflowRegistry, agentRegistry)
    const scheduledTaskUpdater = new ScheduledTaskUpdater(scheduledTaskRepository, scheduledTaskRegistry)

    const channelRegistry = new ChannelRegistry()
    const channelConfigRepository = new JsonChannelConfigRepository(appConfig.paths.channelConfig)
    await channelConfigRepository.ensureInitialized()

    const channelConfigResolver = new ChannelConfigResolver()
    const channelConfigUpdater = new ChannelConfigUpdater(channelConfigRepository, channelRegistry)

    const createChannelToolsDependencies: CreateChannelToolsDependencies = {
        channelRegistry,
        channelConfigRepository,
        channelConfigResolver
    }

    const channelTools = createChannelTools(createChannelToolsDependencies)

    for (const tool of channelTools) {
        toolRegistry.register(tool.name, tool)
    }

    const skillsWatchPattern = `${appConfig.paths.skills}/**/*.md`
    const workflowsWatchPattern = `${appConfig.paths.workflows}/*.json`

    const fileWatcher = new FileWatcher(logger)
    fileWatcher.watch(skillsWatchPattern, event => skillsUpdater.handle(event))
    fileWatcher.watch(appConfig.paths.mcpConfig, event => mcpConfigUpdater.handle(event))
    fileWatcher.watch(appConfig.paths.agentConfig, event => agentConfigUpdater.handle(event))
    fileWatcher.watch(workflowsWatchPattern, event => workflowUpdater.handle(event))
    fileWatcher.watch(appConfig.paths.channelConfig, event => channelConfigUpdater.handle(event))
    fileWatcher.watch(appConfig.paths.scheduledTasks, event => scheduledTaskUpdater.handle(event))

    await fileWatcher.start()
    logger.info('File watcher started', {
        watchedPaths: [
            skillsWatchPattern,
            appConfig.paths.mcpConfig,
            appConfig.paths.agentConfig,
            workflowsWatchPattern,
            appConfig.paths.channelConfig,
            appConfig.paths.scheduledTasks
        ]
    })

    const runMode = parseRunMode()
    const agentDispatcher = new AgentDispatcher(agentRegistry)

    const scheduler = new Scheduler(
        scheduledTaskRegistry,
        scheduledTaskRepository,
        scheduledTaskRunRepository,
        agentDispatcher,
        skillRegistry,
        workflowRegistry,
        workflowRunner,
        channelRegistry,
        sessionManager,
        sessionFactory,
        logger
    )

    await scheduler.start()
    logger.info('Scheduler started', { pendingTasks: scheduledTasks.length })

    const cleanupTasks: Array<() => Promise<void>> = [
        async () => {
            await fileWatcher.stop()
        },
        async () => {
            await mcpConnectionManager.disconnectAll()
        },
        async () => {
            scheduler.stop()
        },
        async () => {
            for (const channel of channelRegistry.list()) {
                await channel.stop()
            }
        }
    ]

    const createSchedulerToolsDependencies: CreateSchedulerToolsDependencies = {
        scheduler,
        scheduledTaskRegistry,
        scheduledTaskRepository,
        scheduledTaskRunRepository,
        agentRegistry,
        workflowRegistry,
        skillRegistry,
        sessionManager
    }

    const schedulerTools = createSchedulerTools(createSchedulerToolsDependencies)

    for (const tool of schedulerTools) {
        toolRegistry.register(tool.name, tool)
    }

    const commandRegistry = new CommandRegistry()
    const agentCommand = new AgentCommand(agentRegistry, agentDispatcher)
    const workflowCommand = new WorkFlowCommand(workflowRegistry, workflowRunner, agentDispatcher)
    commandRegistry.register(agentCommand.name, agentCommand)
    commandRegistry.register(workflowCommand.name, workflowCommand)

    const commandResolver = new CommandResolver(commandRegistry, skillRegistry, agentDispatcher)
    const commandAwareDispatcher = new CommandAwareAgentDispatcher(agentDispatcher, commandResolver)

    if (runMode === RUN_MODE.SERVER) {
        const backendServer = new BackendServer({
            providerRegistry,
            strategyRegistry: thinkingStrategyRegistry,
            toolRegistry,
            agentRegistry,
            rawAgentConfigRepository,
            rawAgentFactory,
            mcpServerRegistry,
            mcpConfigRepository,
            mcpClientFactory: mcpFactory,
            memoryRepository,
            skillRegistry,
            skillRepository,
            skillSafetyInspector,
            commandRegistry,
            sessionManager,
            humanInputResolver: humanInputTool,
            channelRegistry,
            channelConfigRepository,
            guardrailRegistry,
            guardrailResolver: guardrailResolverAggregator,
            guardrailRulesStore,
            workflowRegistry,
            workflowNodeRegistry,
            workflowRepository,
            workflowRunRepository,
            workflowRunner,
            scheduler,
            scheduledTaskRegistry,
            scheduledTaskRepository,
            scheduledTaskRunRepository
        })

        const agentEventBus = new AgentSessionEventBus()
        const webChannel = new WebChannel(backendServer.httpServer, sessionManager, agentRegistry, agentEventBus)
        channelRegistry.register(webChannel.id, webChannel)

        const telegramStateRepository = new JsonTelegramChatStateRepository(appConfig.paths.telegramState)
        await telegramStateRepository.ensureInitialized()

        const telegramChannel = new TelegramChannel(
            sessionManager,
            agentRegistry,
            guardrailResolverAggregator,
            telegramStateRepository,
            logger
        )
        channelRegistry.register(telegramChannel.id, telegramChannel)

        for (const channel of channelRegistry.list()) {
            const config = await channelConfigRepository.findById(channel.id)
            const resolved = channelConfigResolver.resolve(config, channel.settingsSchema)
            channel.configure(resolved)

            channel.onMessage(async (request, response) => {
                await response.stream(
                    commandAwareDispatcher.send(request.agentId, request.session, request.content, {
                        ...(request.outputSchema !== undefined && { outputSchema: request.outputSchema })
                    })
                )
            })

            channel.onStop(async sessionId => {
                await commandAwareDispatcher.stop(sessionId)
            })

            await channel.start()
            logger.info(`Channel "${channel.id}" started`, { channelId: channel.id })
        }

        cleanupTasks.push(async () => {
            await backendServer.httpServer.close()
        })

        await backendServer.start(appConfig.server.port, appConfig.server.host)
        logger.info('Ready', {
            mode: RUN_MODE.SERVER,
            port: appConfig.server.port,
            host: appConfig.server.host,
            channels: channelRegistry.list().map(c => c.id)
        })
    } else {
        const consoleChannel = new ConsoleChannel(sessionManager, agentRegistry)
        const config = await channelConfigRepository.findById(consoleChannel.id)
        const resolved = channelConfigResolver.resolve(config, consoleChannel.settingsSchema)
        consoleChannel.configure(resolved)

        consoleChannel.onMessage(async (request, response) => {
            await response.stream(commandAwareDispatcher.send(request.agentId, request.session, request.content))
        })

        consoleChannel.onStop(async sessionId => {
            await commandAwareDispatcher.stop(sessionId)
        })

        cleanupTasks.push(async () => {
            await consoleChannel.stop()
        })

        await consoleChannel.start()
        logger.info('Ready', { mode: RUN_MODE.CHAT })
    }

    const SHUTDOWN_TIMEOUT_MS = 10_000

    let isShuttingDown = false

    const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
        if (isShuttingDown) return
        isShuttingDown = true

        logger.info('Shutting down', { signal })

        setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit')
            process.exit(1)
        }, SHUTDOWN_TIMEOUT_MS).unref()

        for (const task of cleanupTasks) {
            try {
                await task()
            } catch (error) {
                logger.error('Error during shutdown', { error: getErrorMessage(error) })
            }
        }

        logger.info('Shutdown complete', { signal })
        process.exitCode = 0
    }

    process.on('SIGTERM', () => void shutdown('SIGTERM'))
    process.on('SIGINT', () => void shutdown('SIGINT'))
})().catch((error: unknown) => {
    logger.error('Fatal error', { error: getErrorMessage(error) })
    throw error
})
