import { z } from 'zod'
import { isValidTimeZone } from '@core/utils'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface, RawAgentFactory, RawAgentConfig } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { AgentSummary } from './types'
import { buildAgentSummary } from './utils'
import { createAgentToolSchema } from './validators'
import { BudgetConfig } from '@agent/budget'
import { GuardrailRegistryInterface, GuardrailRuleDecision } from '@guardrail'

export class CreateAgentTool extends BaseAgentTool<typeof createAgentToolSchema> {
    readonly name = 'agent_create'
    readonly description =
        'Creates a new agent, saves its configuration to disk and registers it in the system so it can be used immediately. Patterns that match nothing are silently skipped with a server-side warning rather than an error — double-check the returned summary lists what you expected.'
    readonly schema = createAgentToolSchema

    constructor(
        private readonly agentFactory: RawAgentFactory,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null,
        private readonly guardrailRegistry: GuardrailRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof createAgentToolSchema>): Promise<AgentSummary> {
        if (this.agentRegistry.has(args.id)) {
            throw new AgentToolError(`Agent "${args.id}" already exists.`)
        }

        if (args.timezone !== undefined && !isValidTimeZone(args.timezone)) {
            throw new AgentToolError(`Invalid IANA time zone: "${args.timezone}".`)
        }

        const guardrailRules: Record<string, Record<string, GuardrailRuleDecision>> = {}

        for (const entry of args.guardrailRules ?? []) {
            if (this.guardrailRegistry.get(entry.guardrailId) === null) {
                throw new AgentToolError(`Guardrail "${entry.guardrailId}" not found in registry.`)
            }

            const rules = (guardrailRules[entry.guardrailId] ??= {})
            rules[entry.ruleKey] = entry.decision
        }

        const budget: BudgetConfig | undefined =
            args.budget !== undefined
                ? {
                      ...(args.budget.maxTokens !== undefined && { maxTokens: args.budget.maxTokens }),
                      ...(args.budget.maxIterations !== undefined && { maxIterations: args.budget.maxIterations }),
                      ...(args.budget.maxToolCalls !== undefined && { maxToolCalls: args.budget.maxToolCalls }),
                      ...(args.budget.maxCostUsd !== undefined && { maxCostUsd: args.budget.maxCostUsd }),
                      ...(args.budget.maxDurationMs !== undefined && { maxDurationMs: args.budget.maxDurationMs })
                  }
                : undefined

        const rawConfig: RawAgentConfig = {
            id: args.id,
            name: args.name,
            role: args.role,
            provider: args.provider,
            model: args.model,
            systemPrompt: args.systemPrompt,
            thinkingStrategy: args.thinkingStrategy,
            ...(args.description !== undefined && { description: args.description }),
            ...(args.tools !== undefined && { tools: args.tools }),
            ...(args.skills !== undefined && { skills: args.skills }),
            ...(args.agents !== undefined && { agents: args.agents }),
            ...(args.mcpServers !== undefined && { mcpServers: args.mcpServers }),
            ...(args.workflows !== undefined && { workflows: args.workflows }),
            ...(budget !== undefined && { budget }),
            ...(args.temperature !== undefined && { temperature: args.temperature }),
            ...(args.timezone !== undefined && { timezone: args.timezone }),
            ...(args.metadata !== undefined && { metadata: args.metadata }),
            ...(Object.keys(guardrailRules).length > 0 && { guardrailRules })
        }

        const agent = this.agentFactory(rawConfig)

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.create(rawConfig)
        }

        this.agentRegistry.register(args.id, agent)

        return buildAgentSummary(agent, rawConfig)
    }
}
