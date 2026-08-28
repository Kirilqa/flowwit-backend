import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { AgentSummary } from './types'
import { buildAgentSummary } from './utils'
import { infoAgentToolSchema } from './validators'

export class InfoAgentTool extends BaseAgentTool<typeof infoAgentToolSchema> {
    readonly name = 'agent_info'
    readonly description =
        'Returns the full configuration summary of a specific agent, including both resolved entity names (tools, skills, agents, mcpServers, workflows) and the raw glob patterns that produced them (toolPatterns, skillPatterns, agentPatterns, mcpServerPatterns, workflowPatterns) as currently persisted — use the pattern fields when calling agent_update remove*.'
    readonly schema = infoAgentToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof infoAgentToolSchema>): Promise<AgentSummary> {
        const agent = this.agentRegistry.get(args.agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${args.agentId}" not found.`)
        }

        const rawConfig =
            this.agentConfigRepository !== null ? await this.agentConfigRepository.findById(args.agentId) : null

        return buildAgentSummary(agent, rawConfig)
    }
}
