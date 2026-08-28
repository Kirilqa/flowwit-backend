import { z } from 'zod'
import { WorkFlowRegistryInterface, WorkFlowRepositoryInterface } from '@workflow'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { deleteWorkFlowToolSchema } from './validators'

export class DeleteWorkFlowTool extends BaseWorkFlowTool<typeof deleteWorkFlowToolSchema> {
    readonly name = 'workflow_delete'
    readonly description =
        'Permanently deletes a workflow from the system. This action cannot be undone. Running workflow runs are not affected.'
    readonly schema = deleteWorkFlowToolSchema

    constructor(
        private readonly workflowRepository: WorkFlowRepositoryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteWorkFlowToolSchema>): Promise<{ workflowId: string }> {
        if (!this.workflowRegistry.has(args.workflowId)) {
            throw new AgentToolError(`WorkFlow "${args.workflowId}" not found`)
        }

        await this.workflowRepository.delete(args.workflowId)
        this.workflowRegistry.unregister(args.workflowId)

        return { workflowId: args.workflowId }
    }
}
