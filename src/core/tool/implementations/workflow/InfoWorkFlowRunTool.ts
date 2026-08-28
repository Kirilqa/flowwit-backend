import { z } from 'zod'
import { WorkFlowRunRepositoryInterface } from '@workflow'
import { AgentToolError } from '../../errors'
import { BaseWorkFlowTool } from './bases/BaseWorkFlowTool'
import { WorkFlowRunDetail, WorkFlowRunNodeStateDetail } from './types'
import { infoWorkFlowRunToolSchema } from './validators'

export class InfoWorkFlowRunTool extends BaseWorkFlowTool<typeof infoWorkFlowRunToolSchema> {
    readonly name = 'workflow_run_info'
    readonly description =
        'Returns the full details of a workflow run including status, output, and per-node execution state. Useful for diagnosing failures or inspecting intermediate results.'
    readonly schema = infoWorkFlowRunToolSchema

    constructor(private readonly workflowRunRepository: WorkFlowRunRepositoryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof infoWorkFlowRunToolSchema>): Promise<WorkFlowRunDetail> {
        const workflowRun = await this.workflowRunRepository.findById(args.runId)

        if (workflowRun === null) {
            throw new AgentToolError(`WorkFlow run "${args.runId}" not found`)
        }

        const nodeStates: Record<string, WorkFlowRunNodeStateDetail> = {}

        for (const entry of workflowRun.getEntries()) {
            nodeStates[entry.id] = {
                executions: Object.values(entry.executions).map(execution => ({
                    executionId: execution.executionId,
                    status: execution.status,
                    ...(execution.resolvedPorts !== undefined && { input: execution.resolvedPorts }),
                    ...(execution.resolvedConfig !== undefined && { config: execution.resolvedConfig }),
                    ...(execution.output !== undefined && { output: execution.output }),
                    ...(execution.error !== undefined && { error: execution.error }),
                    ...(execution.startedAt !== undefined && { startedAt: execution.startedAt }),
                    ...(execution.completedAt !== undefined && { completedAt: execution.completedAt })
                }))
            }
        }

        return {
            id: workflowRun.id,
            workflowId: workflowRun.workflowId,
            status: workflowRun.status,
            input: workflowRun.input,
            output: workflowRun.getOutput(),
            nodeStates,
            createdAt: workflowRun.createdAt,
            updatedAt: workflowRun.updatedAt
        }
    }
}
