import { WorkFlowEvent, WORKFLOW_EVENT_TYPE } from '@workflow'
import { WorkFlowSseEvent } from '../types/WorkFlowSseEvent'
import { WORKFLOW_SSE_EVENT_TYPE } from '../types/WorkFlowSseEventType'

export function mapWorkFlowEventToSseEvent(event: WorkFlowEvent): WorkFlowSseEvent | null {
    switch (event.type) {
        case WORKFLOW_EVENT_TYPE.RUN_STARTED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.RUN_STARTED,
                data: { runId: event.runId }
            }

        case WORKFLOW_EVENT_TYPE.RUN_COMPLETED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.RUN_COMPLETED,
                data: { runId: event.runId, output: event.output }
            }

        case WORKFLOW_EVENT_TYPE.RUN_FAILED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.RUN_FAILED,
                data: { runId: event.runId, error: event.error }
            }

        case WORKFLOW_EVENT_TYPE.NODE_STARTED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.NODE_STARTED,
                data: {
                    nodeId: event.nodeId,
                    executionId: event.executionId,
                    input: event.input,
                    config: event.config
                }
            }

        case WORKFLOW_EVENT_TYPE.NODE_COMPLETED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.NODE_COMPLETED,
                data: { nodeId: event.nodeId, executionId: event.executionId, output: event.output }
            }

        case WORKFLOW_EVENT_TYPE.NODE_FAILED:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.NODE_FAILED,
                data: { nodeId: event.nodeId, executionId: event.executionId, error: event.error }
            }

        case WORKFLOW_EVENT_TYPE.NODE_EVENT:
            return {
                event: WORKFLOW_SSE_EVENT_TYPE.NODE_EVENT,
                data: { nodeId: event.nodeId, executionId: event.executionId, payload: event.payload }
            }

        default:
            return null
    }
}
