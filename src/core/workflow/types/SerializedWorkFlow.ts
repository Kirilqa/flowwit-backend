import { WorkFlowConnection } from './WorkFlowConnection'
import { SerializedWorkFlowNodeEntry } from './SerializedWorkFlowNodeEntry'

export type SerializedWorkFlow = {
    id: string
    name: string
    description?: string
    entries: Array<SerializedWorkFlowNodeEntry>
    connections: Array<WorkFlowConnection>
}
