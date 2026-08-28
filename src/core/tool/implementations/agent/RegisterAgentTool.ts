import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { AgentSummary } from './types'
import { buildAgentSummary } from './utils'
import { registerAgentToolSchema } from './validators'

export class RegisterAgentTool extends BaseAgentTool<typeof registerAgentToolSchema> {
    readonly name = 'agent_register'
    readonly description =
        'Registers an existing agent as your sub-agent, making it available for delegation. The agent must already be present in the system — use agent_create first if needed.'
    readonly schema = registerAgentToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof registerAgentToolSchema>, agentId: string): Promise<AgentSummary> {
        if (args.agentId === agentId) {
            throw new AgentToolError('An agent cannot register itself as a sub-agent.')
        }

        const currentAgent = this.agentRegistry.get(agentId)

        if (currentAgent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const subAgent = this.agentRegistry.get(args.agentId)

        if (subAgent === null) {
            throw new AgentToolError(
                `Agent "${args.agentId}" not found in registry. Create it first using agent_create.`
            )
        }

        const alreadyRegistered = currentAgent.config.agents?.some(a => a.config.id === args.agentId) ?? false

        if (alreadyRegistered) {
            throw new AgentToolError(`Agent "${args.agentId}" is already registered as a sub-agent.`)
        }

        const updatedAgents = [...(currentAgent.config.agents ?? []), subAgent]

        currentAgent.update({ agents: updatedAgents })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { agents: updatedAgents.map(a => a.config.id) })
        }

        return buildAgentSummary(subAgent)
    }
}
