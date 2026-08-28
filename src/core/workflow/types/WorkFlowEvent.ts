import { WORKFLOW_EVENT_TYPE } from './WorkFlowEventType'

export type WorkFlowEventBase = {
    id: string
    runId: string
    createdAt: number
}

export type WorkFlowEventNodeBase = WorkFlowEventBase & {
    nodeId: string
    executionId: string
}

export type RunStartedEvent = WorkFlowEventBase & {
    type: typeof WORKFLOW_EVENT_TYPE.RUN_STARTED
}

export type RunCompletedEvent = WorkFlowEventBase & {
    type: typeof WORKFLOW_EVENT_TYPE.RUN_COMPLETED
    output: Record<string, unknown>
}

export type RunFailedEvent = WorkFlowEventBase & {
    type: typeof WORKFLOW_EVENT_TYPE.RUN_FAILED
    error: string
}

export type NodeStartedEvent = WorkFlowEventNodeBase & {
    type: typeof WORKFLOW_EVENT_TYPE.NODE_STARTED
    input: Record<string, unknown>
    config: Record<string, unknown>
}

export type NodeCompletedEvent = WorkFlowEventNodeBase & {
    type: typeof WORKFLOW_EVENT_TYPE.NODE_COMPLETED
    output: Record<string, unknown>
}

export type NodeFailedEvent = WorkFlowEventNodeBase & {
    type: typeof WORKFLOW_EVENT_TYPE.NODE_FAILED
    error: string
}

export type NodeEvent = WorkFlowEventNodeBase & {
    type: typeof WORKFLOW_EVENT_TYPE.NODE_EVENT
    payload: unknown
}

export type WorkFlowEvent =
    | RunStartedEvent
    | RunCompletedEvent
    | RunFailedEvent
    | NodeStartedEvent
    | NodeCompletedEvent
    | NodeFailedEvent
    | NodeEvent
