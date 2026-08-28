import { WorkFlowRunStatus } from '@workflow'
import { WorkFlowRunNodeStateDetail } from './WorkFlowRunNodeStateDetail'

export type WorkFlowRunDetail = {
    id: string
    workflowId: string
    status: WorkFlowRunStatus
    input: unknown
    output: Record<string, unknown>
    nodeStates: Record<string, WorkFlowRunNodeStateDetail>
    createdAt: number
    updatedAt: number
}
