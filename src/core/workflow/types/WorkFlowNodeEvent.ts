import { WorkFlowEventNodeBase } from './WorkFlowEvent'
import { WORKFLOW_EVENT_TYPE } from './WorkFlowEventType'

export type WorkFlowNodeEventBase = Omit<WorkFlowEventNodeBase, 'id' | 'runId' | 'nodeId' | 'executionId'>

export type WorkFlowNodeEvent = WorkFlowNodeEventBase & {
    type: typeof WORKFLOW_EVENT_TYPE.NODE_EVENT
    payload: unknown
}
