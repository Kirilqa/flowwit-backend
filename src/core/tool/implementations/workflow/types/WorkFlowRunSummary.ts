import { WorkFlowRunStatus } from '@workflow'

export type WorkFlowRunSummary = {
    id: string
    workflowId: string
    status: WorkFlowRunStatus
    input: unknown
    createdAt: number
    updatedAt: number
}
