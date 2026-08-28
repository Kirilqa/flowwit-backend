import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseAgentTool } from './bases/BaseAgentTool'
import { deleteAgentToolSchema } from './validators'

export class DeleteAgentTool extends BaseAgentTool<typeof deleteAgentToolSchema> {
    readonly name = 'agent_delete'
    readonly description =
        'Deletes an agent configuration from disk and removes it from the system registry. This action cannot be undone.'
    readonly schema = deleteAgentToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteAgentToolSchema>, agentId: string): Promise<string> {
        if (args.agentId === agentId) {
            throw new AgentToolError('An agent cannot delete itself.')
        }

        const existing = this.agentRegistry.get(args.agentId)

        if (existing === null) {
            throw new AgentToolError(`Agent "${args.agentId}" not found.`)
        }

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.delete(args.agentId)
        }

        this.agentRegistry.unregister(args.agentId)

        return `Agent "${args.agentId}" deleted successfully.`
    }
}
