import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { AgentSummary } from './types'
import { buildAgentSummary } from './utils/buildAgentSummary'
import { listAgentsToolSchema } from './validators'

export class ListAgentsTool extends BaseAgentTool<typeof listAgentsToolSchema> {
    readonly name = 'agent_list'
    readonly description =
        'Returns a list of all agents registered in the system with their configuration summaries, including both resolved entity names (tools, skills, agents, mcpServers, workflows) and the raw glob patterns that produced them (toolPatterns, skillPatterns, agentPatterns, mcpServerPatterns, workflowPatterns) as currently persisted.'
    readonly schema = listAgentsToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(_args: z.infer<typeof listAgentsToolSchema>): Promise<Array<AgentSummary>> {
        const rawConfigs = this.agentConfigRepository !== null ? await this.agentConfigRepository.findAll() : []
        const rawConfigById = new Map(rawConfigs.map(raw => [raw.id, raw]))

        return this.agentRegistry
            .list()
            .map(agent => buildAgentSummary(agent, rawConfigById.get(agent.config.id) ?? null))
    }
}
