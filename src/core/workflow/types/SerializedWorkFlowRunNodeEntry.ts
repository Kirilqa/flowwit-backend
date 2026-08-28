import { SerializedWorkFlowNodeEntry } from './SerializedWorkFlowNodeEntry'
import { WorkFlowNodeExecution } from './WorkFlowNodeExecution'

export type SerializedWorkFlowRunNodeEntry = SerializedWorkFlowNodeEntry & {
    executions: Record<string, WorkFlowNodeExecution>
}
