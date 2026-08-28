import { z } from 'zod'
import { WorkFlowRegistryInterface } from '@workflow'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowSummary } from './types'
import { buildWorkFlowSummary } from './utils'
import { registerWorkFlowToolSchema } from './validators'

export class RegisterWorkFlowTool extends BaseWorkFlowTool<typeof registerWorkFlowToolSchema> {
    readonly name = 'workflow_register'
    readonly description =
        'Registers an existing workflow with your agent, making it available as a tool. The workflow must already be present in the system — use workflow_create first if needed.'
    readonly schema = registerWorkFlowToolSchema

    constructor(
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof registerWorkFlowToolSchema>, agentId: string): Promise<WorkFlowSummary> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found`)
        }

        const workflow = this.workflowRegistry.get(args.workflowId)

        if (workflow === null) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" not found. Create it first using workflow_create.`)
        }

        const alreadyRegistered = agent.config.workflows?.some(w => w.id === args.workflowId) ?? false

        if (alreadyRegistered) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" is already registered with this agent.`)
        }

        const updatedWorkflows = [...(agent.config.workflows ?? []), workflow]

        agent.update({ workflows: updatedWorkflows })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { workflows: updatedWorkflows.map(w => w.id) })
        }

        return buildWorkFlowSummary(workflow)
    }
}
