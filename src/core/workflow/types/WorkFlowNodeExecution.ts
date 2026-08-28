import { WorkFlowNodeStateStatus } from './WorkFlowNodeStateStatus'

export type WorkFlowNodeExecution = {
    executionId: string
    status: WorkFlowNodeStateStatus
    receivedPorts: Record<string, unknown>
    resolvedPorts?: Record<string, unknown>
    resolvedConfig?: Record<string, unknown>
    output?: Record<string, unknown>
    state?: Record<string, unknown>
    error?: string
    startedAt?: number
    completedAt?: number
}
