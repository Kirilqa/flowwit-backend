import { WorkFlowNodeEntry } from './WorkFlowNodeEntry'
import { WorkFlowNodeExecution } from './WorkFlowNodeExecution'

export type WorkFlowRunNodeEntry = WorkFlowNodeEntry & {
    executions: Record<string, WorkFlowNodeExecution>
}
