import { SerializedWorkFlowRunNodeEntry } from './SerializedWorkFlowRunNodeEntry'
import { WorkFlowConnection } from './WorkFlowConnection'
import { WorkFlowRunStatus } from './WorkFlowRunStatus'

export type SerializedWorkFlowRun = {
    id: string
    workflowId: string
    status: WorkFlowRunStatus
    input: unknown
    entries: Array<SerializedWorkFlowRunNodeEntry>
    connections: Array<WorkFlowConnection>
    createdAt: number
    updatedAt: number
}
