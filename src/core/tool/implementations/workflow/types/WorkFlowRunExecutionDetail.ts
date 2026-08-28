import { WorkFlowNodeStateStatus } from '@workflow'

export type WorkFlowRunExecutionDetail = {
    executionId: string
    status: WorkFlowNodeStateStatus
    input?: Record<string, unknown>
    config?: Record<string, unknown>
    output?: Record<string, unknown>
    error?: string
    startedAt?: number
    completedAt?: number
}
