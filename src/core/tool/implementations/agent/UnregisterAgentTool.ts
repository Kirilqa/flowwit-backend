import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { unregisterAgentToolSchema } from './validators'

export class UnregisterAgentTool extends BaseAgentTool<typeof unregisterAgentToolSchema> {
    readonly name = 'agent_unregister'
    readonly description =
        'Unregisters a sub-agent from yourself, making it unavailable for delegation. The agent remains in the system and can be re-registered later.'
    readonly schema = unregisterAgentToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof unregisterAgentToolSchema>, agentId: string): Promise<string> {
        const currentAgent = this.agentRegistry.get(agentId)

        if (currentAgent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const isRegistered = currentAgent.config.agents?.some(a => a.config.id === args.agentId) ?? false

        if (!isRegistered) {
            throw new AgentToolError(`Agent "${args.agentId}" is not registered as a sub-agent.`)
        }

        const updatedAgents = (currentAgent.config.agents ?? []).filter(a => a.config.id !== args.agentId)

        currentAgent.update({ agents: updatedAgents })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { agents: updatedAgents.map(a => a.config.id) })
        }

        return `Agent "${args.agentId}" unregistered successfully.`
    }
}
