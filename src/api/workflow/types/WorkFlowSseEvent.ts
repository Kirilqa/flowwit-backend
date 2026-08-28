import { WORKFLOW_SSE_EVENT_TYPE } from './WorkFlowSseEventType'

export type WorkFlowRunStartedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.RUN_STARTED
    data: { runId: string }
}

export type WorkFlowRunCompletedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.RUN_COMPLETED
    data: { runId: string; output: Record<string, unknown> }
}

export type WorkFlowRunFailedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.RUN_FAILED
    data: { runId: string; error: string }
}

export type WorkFlowNodeStartedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.NODE_STARTED
    data: {
        nodeId: string
        executionId: string
        input: Record<string, unknown>
        config: Record<string, unknown>
    }
}

export type WorkFlowNodeCompletedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.NODE_COMPLETED
    data: { nodeId: string; executionId: string; output: Record<string, unknown> }
}

export type WorkFlowNodeFailedSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.NODE_FAILED
    data: { nodeId: string; executionId: string; error: string }
}

export type WorkFlowNodeEventSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.NODE_EVENT
    data: { nodeId: string; executionId: string; payload: unknown }
}

export type WorkFlowErrorSseEvent = {
    event: typeof WORKFLOW_SSE_EVENT_TYPE.ERROR
    data: { message: string }
}

export type WorkFlowSseEvent =
    | WorkFlowRunStartedSseEvent
    | WorkFlowRunCompletedSseEvent
    | WorkFlowRunFailedSseEvent
    | WorkFlowNodeStartedSseEvent
    | WorkFlowNodeCompletedSseEvent
    | WorkFlowNodeFailedSseEvent
    | WorkFlowNodeEventSseEvent
    | WorkFlowErrorSseEvent
