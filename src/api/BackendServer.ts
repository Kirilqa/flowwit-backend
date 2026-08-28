import Fastify, { FastifyInstance } from 'fastify'
import {
    AgentsController,
    ChannelsController,
    CommandsController,
    GuardrailController,
    GuardrailsController,
    GuardrailRulesController,
    HealthController,
    HumanInputController,
    MCPServersController,
    MemoryController,
    SkillsController,
    ProvidersController,
    ScheduledTasksController,
    ScheduledTaskRunsController,
    SessionsController,
    StrategiesController,
    ToolsController
} from './controllers'
import {
    agentRoutes,
    channelRoutes,
    commandRoutes,
    guardrailRoutes,
    guardrailsRoutes,
    guardrailRulesRoutes,
    healthRoutes,
    humanInputRoutes,
    mcpServerRoutes,
    memoryRoutes,
    providerRoutes,
    scheduledTaskRoutes,
    scheduledTaskRunRoutes,
    sessionRoutes,
    skillRoutes,
    strategyRoutes,
    toolRoutes
} from './routes'
import { WorkFlowController } from './workflow/controllers/WorkFlowController'
import { WorkFlowNodeController } from './workflow/controllers/WorkFlowNodeController'
import { WorkFlowRunController } from './workflow/controllers/WorkFlowRunController'
import { WorkFlowRunEventBus } from './workflow/WorkFlowRunEventBus'
import { workflowNodeRoutes } from './workflow/routes/workflowNodeRoutes'
import { workflowRoutes } from './workflow/routes/workflowRoutes'
import { workflowRunRoutes } from './workflow/routes/workflowRunRoutes'
import { BackendServerOptions } from './types'

export class BackendServer {
    private readonly fastify: FastifyInstance

    constructor(options: BackendServerOptions) {
        const {
            providerRegistry,
            strategyRegistry,
            toolRegistry,
            agentRegistry,
            rawAgentConfigRepository,
            rawAgentFactory,
            mcpServerRegistry,
            mcpConfigRepository,
            mcpClientFactory,
            memoryRepository,
            skillRegistry,
            skillRepository,
            skillSafetyInspector,
            commandRegistry,
            sessionManager,
            humanInputResolver,
            channelRegistry,
            channelConfigRepository,
            guardrailRegistry,
            guardrailResolver,
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
        } = options

        this.fastify = Fastify({ logger: false })

        const workflowEventBus = new WorkFlowRunEventBus()

        const healthController = new HealthController()
        const providersController = new ProvidersController(providerRegistry)
        const strategiesController = new StrategiesController(strategyRegistry)
        const toolsController = new ToolsController(toolRegistry)
        const agentsController = new AgentsController(
            agentRegistry,
            rawAgentConfigRepository,
            rawAgentFactory,
            guardrailRegistry
        )
        const mcpServersController = new MCPServersController(mcpServerRegistry, mcpConfigRepository, mcpClientFactory)
        const memoryController = new MemoryController(memoryRepository)
        const skillsController = new SkillsController(skillRegistry, skillRepository, skillSafetyInspector)
        const commandsController = new CommandsController(commandRegistry, skillRegistry)
        const channelsController = new ChannelsController(channelRegistry, channelConfigRepository)
        const sessionsController = new SessionsController(sessionManager, guardrailRulesStore)
        const humanInputController = new HumanInputController(humanInputResolver)
        const workflowController = new WorkFlowController(
            workflowRegistry,
            workflowRepository,
            workflowRunRepository,
            workflowRunner,
            workflowEventBus,
            workflowNodeRegistry
        )
        const workflowRunController = new WorkFlowRunController(workflowRunRepository, workflowRunner, workflowEventBus)
        const workflowNodeController = new WorkFlowNodeController(workflowNodeRegistry)

        const guardrailsController = new GuardrailsController(guardrailRegistry)
        const guardrailRulesController = new GuardrailRulesController(guardrailRulesStore)

        const scheduledTasksController = new ScheduledTasksController(
            scheduledTaskRegistry,
            scheduledTaskRepository,
            scheduledTaskRunRepository,
            scheduler,
            agentRegistry,
            workflowRegistry,
            skillRegistry,
            sessionManager
        )
        const scheduledTaskRunsController = new ScheduledTaskRunsController(scheduledTaskRunRepository)

        healthRoutes(this.fastify, healthController)
        channelRoutes(this.fastify, channelsController)
        providerRoutes(this.fastify, providersController)
        strategyRoutes(this.fastify, strategiesController)
        toolRoutes(this.fastify, toolsController)
        agentRoutes(this.fastify, agentsController)
        mcpServerRoutes(this.fastify, mcpServersController)
        memoryRoutes(this.fastify, memoryController)
        skillRoutes(this.fastify, skillsController)
        commandRoutes(this.fastify, commandsController)
        sessionRoutes(this.fastify, sessionsController)
        humanInputRoutes(this.fastify, humanInputController)
        guardrailsRoutes(this.fastify, guardrailsController)
        guardrailRulesRoutes(this.fastify, guardrailRulesController)
        workflowRoutes(this.fastify, workflowController)
        workflowRunRoutes(this.fastify, workflowRunController)
        workflowNodeRoutes(this.fastify, workflowNodeController)
        scheduledTaskRoutes(this.fastify, scheduledTasksController)
        scheduledTaskRunRoutes(this.fastify, scheduledTaskRunsController)

        if (guardrailResolver !== undefined) {
            const guardrailController = new GuardrailController(guardrailResolver)
            guardrailRoutes(this.fastify, guardrailController)
        }
    }

    get httpServer(): FastifyInstance {
        return this.fastify
    }

    async start(port: number, host = '0.0.0.0'): Promise<void> {
        await this.fastify.listen({ port, host })
    }
}
