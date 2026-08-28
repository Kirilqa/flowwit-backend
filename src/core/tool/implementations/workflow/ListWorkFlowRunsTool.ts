import { z } from 'zod'
import { WorkFlowRunRepositoryInterface } from '@workflow'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowRunSummary } from './types'
import { listWorkFlowRunsToolSchema } from './validators'

export class ListWorkFlowRunsTool extends BaseWorkFlowTool<typeof listWorkFlowRunsToolSchema> {
    readonly name = 'workflow_list_runs'
    readonly description =
        'Lists workflow runs with optional filters. Use workflowId to scope to a specific workflow and status to filter by execution state.'
    readonly schema = listWorkFlowRunsToolSchema

    constructor(private readonly workflowRunRepository: WorkFlowRunRepositoryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof listWorkFlowRunsToolSchema>): Promise<Array<WorkFlowRunSummary>> {
        const allRuns = await this.workflowRunRepository.findAll()

        return allRuns
            .filter(run => {
                if (args.workflowId !== undefined && run.workflowId !== args.workflowId) return false
                if (args.status !== undefined && run.status !== args.status) return false
                return true
            })
            .map(run => ({
                id: run.id,
                workflowId: run.workflowId,
                status: run.status,
                input: run.input,
                createdAt: run.createdAt,
                updatedAt: run.updatedAt
            }))
    }
}
