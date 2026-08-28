import { WorkFlowConnection } from '../types/WorkFlowConnection'
import { WorkFlowRunNodeEntry } from '../types/WorkFlowRunNodeEntry'
import { WorkFlowRunStatus } from '../types/WorkFlowRunStatus'

export interface WorkFlowRunInterface {
    readonly id: string
    readonly workflowId: string
    readonly status: WorkFlowRunStatus
    readonly input: unknown
    readonly createdAt: number
    readonly updatedAt: number
    getEntries(): Array<WorkFlowRunNodeEntry>
    getConnections(): Array<WorkFlowConnection>
    getEntryById(id: string): WorkFlowRunNodeEntry | null
    getOutput(): Record<string, unknown>
    setStatus(status: WorkFlowRunStatus): void
}
