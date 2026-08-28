import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { unregisterWorkFlowToolSchema } from './validators'

export class UnregisterWorkFlowTool extends BaseWorkFlowTool<typeof unregisterWorkFlowToolSchema> {
    readonly name = 'workflow_unregister'
    readonly description =
        'Removes a workflow from your agent. The workflow itself is not deleted from the system, only the association with your agent is removed.'
    readonly schema = unregisterWorkFlowToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(
        args: z.infer<typeof unregisterWorkFlowToolSchema>,
        agentId: string
    ): Promise<{ workflowId: string }> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found`)
        }

        const isRegistered = agent.config.workflows?.some(w => w.id === args.workflowId) ?? false

        if (!isRegistered) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" is not registered with this agent.`)
        }

        const updatedWorkflows = (agent.config.workflows ?? []).filter(w => w.id !== args.workflowId)

        agent.update({ workflows: updatedWorkflows })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { workflows: updatedWorkflows.map(w => w.id) })
        }

        return { workflowId: args.workflowId }
    }
}
