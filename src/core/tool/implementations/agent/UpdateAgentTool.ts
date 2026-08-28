import { z } from 'zod'
import { isValidTimeZone } from '@core/utils'
import { ProviderRegistryInterface } from '@provider'
import { WorkFlowRegistryInterface } from '@workflow'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface, resolveByPatterns, RawAgentConfig } from '@agent'
import { BudgetConfig } from '@agent/budget'
import { GuardrailRegistryInterface, GuardrailRuleDecision } from '@guardrail'
import { MCPServerRegistryInterface } from '@mcp'
import { SkillRegistryInterface } from '@skill'
import { ThinkingStrategyRegistryInterface } from '@strategy'
import { AgentToolError } from '../../errors'
import { ToolRegistryInterface } from '../../interfaces'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { AgentSummary, UpdateAgentToolDependencies } from './types'
import { buildAgentSummary } from './utils'
import { updateAgentToolSchema } from './validators'

const throwOnUnmatchedPattern = (entityType: string, pattern: string): never => {
    throw new AgentToolError(`${entityType} "${pattern}" not found in registry.`)
}

export class UpdateAgentTool extends BaseAgentTool<typeof updateAgentToolSchema> {
    readonly name = 'agent_update'
    readonly description =
        'Updates an existing agent configuration. Only provided fields are changed. Capability fields (tools, skills, agents, mcpServers, workflows) are edited via add*/remove* pairs, not replaced wholesale — add* accepts glob patterns matched against the registry, remove* removes a pattern string that was previously granted exactly as given (not re-matched as a glob). budget and metadata still replace entirely when provided.'
    readonly schema = updateAgentToolSchema

    private readonly agentRegistry: AgentRegistryInterface
    private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    private readonly providerRegistry: ProviderRegistryInterface
    private readonly thinkingStrategyRegistry: ThinkingStrategyRegistryInterface
    private readonly toolRegistry: ToolRegistryInterface
    private readonly skillRegistry: SkillRegistryInterface
    private readonly mcpServerRegistry: MCPServerRegistryInterface
    private readonly workflowRegistry: WorkFlowRegistryInterface
    private readonly guardrailRegistry: GuardrailRegistryInterface

    constructor(dependencies: UpdateAgentToolDependencies) {
        super()
        this.agentRegistry = dependencies.agentRegistry
        this.agentConfigRepository = dependencies.rawAgentConfigRepository ?? null
        this.providerRegistry = dependencies.providerRegistry
        this.thinkingStrategyRegistry = dependencies.thinkingStrategyRegistry
        this.toolRegistry = dependencies.toolRegistry
        this.skillRegistry = dependencies.skillRegistry
        this.mcpServerRegistry = dependencies.mcpServerRegistry
        this.workflowRegistry = dependencies.workflowRegistry
        this.guardrailRegistry = dependencies.guardrailRegistry
    }

    protected async run(args: z.infer<typeof updateAgentToolSchema>): Promise<AgentSummary> {
        const agent = this.agentRegistry.get(args.agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${args.agentId}" not found.`)
        }

        const rawConfig =
            this.agentConfigRepository !== null ? await this.agentConfigRepository.findById(args.agentId) : null

        const patch: Parameters<typeof agent.update>[0] = {}
        const rawPatch: Partial<RawAgentConfig> = {}

        if (args.name !== undefined) {
            patch.name = args.name
            rawPatch.name = args.name
        }

        if (args.role !== undefined) {
            patch.role = args.role
            rawPatch.role = args.role
        }

        if (args.description !== undefined) {
            patch.description = args.description
            rawPatch.description = args.description
        }

        if (args.model !== undefined) {
            patch.model = args.model
            rawPatch.model = args.model
        }

        if (args.systemPrompt !== undefined) {
            patch.systemPrompt = args.systemPrompt
            rawPatch.systemPrompt = args.systemPrompt
        }

        if (args.temperature !== undefined) {
            patch.temperature = args.temperature
            rawPatch.temperature = args.temperature
        }

        if (args.timezone !== undefined) {
            if (!isValidTimeZone(args.timezone)) {
                throw new AgentToolError(`Invalid IANA time zone: "${args.timezone}".`)
            }

            patch.timezone = args.timezone
            rawPatch.timezone = args.timezone
        }

        if (args.provider !== undefined) {
            const provider = this.providerRegistry.get(args.provider)

            if (provider === null) {
                throw new AgentToolError(`Provider "${args.provider}" not found in registry.`)
            }

            patch.provider = provider
            rawPatch.provider = args.provider
        }

        if (args.thinkingStrategy !== undefined) {
            const strategy = this.thinkingStrategyRegistry.get(args.thinkingStrategy)

            if (strategy === null) {
                throw new AgentToolError(`Thinking strategy "${args.thinkingStrategy}" not found in registry.`)
            }

            patch.thinkingStrategy = strategy
            rawPatch.thinkingStrategy = args.thinkingStrategy
        }

        if (args.budget !== undefined) {
            const budget: BudgetConfig = {
                ...(args.budget.maxTokens !== undefined && { maxTokens: args.budget.maxTokens }),
                ...(args.budget.maxIterations !== undefined && { maxIterations: args.budget.maxIterations }),
                ...(args.budget.maxToolCalls !== undefined && { maxToolCalls: args.budget.maxToolCalls }),
                ...(args.budget.maxCostUsd !== undefined && { maxCostUsd: args.budget.maxCostUsd }),
                ...(args.budget.maxDurationMs !== undefined && { maxDurationMs: args.budget.maxDurationMs })
            }

            patch.budget = budget
            rawPatch.budget = budget
        }

        const toolsPatterns = this.applyPatternDelta(rawConfig?.tools, args.addTools, args.removeTools)

        if (toolsPatterns !== undefined) {
            patch.tools = resolveByPatterns(
                toolsPatterns,
                this.toolRegistry.list(),
                tool => tool.name,
                'Tool',
                args.agentId,
                throwOnUnmatchedPattern
            )
            rawPatch.tools = toolsPatterns
        }

        const skillsPatterns = this.applyPatternDelta(rawConfig?.skills, args.addSkills, args.removeSkills)

        if (skillsPatterns !== undefined) {
            patch.skills = resolveByPatterns(
                skillsPatterns,
                this.skillRegistry.list(),
                skill => skill.name,
                'Skill',
                args.agentId,
                throwOnUnmatchedPattern
            )
            rawPatch.skills = skillsPatterns
        }

        const agentsPatterns = this.applyPatternDelta(rawConfig?.agents, args.addAgents, args.removeAgents)

        if (agentsPatterns !== undefined) {
            patch.agents = resolveByPatterns(
                agentsPatterns,
                this.agentRegistry.list(),
                subAgent => subAgent.config.id,
                'Sub-agent',
                args.agentId,
                throwOnUnmatchedPattern
            )
            rawPatch.agents = agentsPatterns
        }

        const mcpServersPatterns = this.applyPatternDelta(
            rawConfig?.mcpServers,
            args.addMcpServers,
            args.removeMcpServers
        )

        if (mcpServersPatterns !== undefined) {
            patch.mcpServers = resolveByPatterns(
                mcpServersPatterns,
                this.mcpServerRegistry.list(),
                server => server.alias,
                'MCP server',
                args.agentId,
                throwOnUnmatchedPattern
            )
            rawPatch.mcpServers = mcpServersPatterns
        }

        const workflowsPatterns = this.applyPatternDelta(rawConfig?.workflows, args.addWorkflows, args.removeWorkflows)

        if (workflowsPatterns !== undefined) {
            patch.workflows = resolveByPatterns(
                workflowsPatterns,
                this.workflowRegistry.list(),
                workflow => workflow.id,
                'WorkFlow',
                args.agentId,
                throwOnUnmatchedPattern
            )
            rawPatch.workflows = workflowsPatterns
        }

        const guardrailRules = this.applyGuardrailRulesDelta(
            rawConfig?.guardrailRules,
            args.setGuardrailRules,
            args.removeGuardrailRules
        )

        if (guardrailRules !== undefined) {
            patch.guardrailRules = guardrailRules
            rawPatch.guardrailRules = guardrailRules
        }

        agent.update(patch)

        const updatedRawConfig =
            this.agentConfigRepository !== null ? await this.agentConfigRepository.update(args.agentId, rawPatch) : null

        return buildAgentSummary(agent, updatedRawConfig)
    }

    private applyPatternDelta(
        current: Array<string> | undefined,
        add: Array<string> | undefined,
        remove: Array<string> | undefined
    ): Array<string> | undefined {
        if (add === undefined && remove === undefined) {
            return undefined
        }

        const withAdditions = [...(current ?? [])]

        for (const pattern of add ?? []) {
            if (!withAdditions.includes(pattern)) {
                withAdditions.push(pattern)
            }
        }

        const removeSet = new Set(remove ?? [])
        return withAdditions.filter(pattern => !removeSet.has(pattern))
    }

    private applyGuardrailRulesDelta(
        current: Record<string, Record<string, GuardrailRuleDecision>> | undefined,
        set: Array<{ guardrailId: string; ruleKey: string; decision: GuardrailRuleDecision }> | undefined,
        remove: Array<{ guardrailId: string; ruleKey: string }> | undefined
    ): Record<string, Record<string, GuardrailRuleDecision>> | undefined {
        if (set === undefined && remove === undefined) {
            return undefined
        }

        const result = new Map<string, Map<string, GuardrailRuleDecision>>(
            Object.entries(current ?? {}).map(([guardrailId, rules]) => [guardrailId, new Map(Object.entries(rules))])
        )

        for (const entry of set ?? []) {
            if (this.guardrailRegistry.get(entry.guardrailId) === null) {
                throw new AgentToolError(`Guardrail "${entry.guardrailId}" not found in registry.`)
            }

            let rules = result.get(entry.guardrailId)

            if (!rules) {
                rules = new Map()
                result.set(entry.guardrailId, rules)
            }

            rules.set(entry.ruleKey, entry.decision)
        }

        for (const entry of remove ?? []) {
            const rules = result.get(entry.guardrailId)
            rules?.delete(entry.ruleKey)

            if (rules?.size === 0) {
                result.delete(entry.guardrailId)
            }
        }

        return Object.fromEntries(
            Array.from(result, ([guardrailId, rules]) => [guardrailId, Object.fromEntries(rules)])
        )
    }
}
