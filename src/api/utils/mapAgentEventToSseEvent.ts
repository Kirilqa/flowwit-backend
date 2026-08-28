import { AgentEvent, AGENT_EVENT_TYPE } from '@agent'
import { SSE_EVENT_TYPE, SseEvent } from '../types'

export function mapAgentEventToSseEvent(event: AgentEvent): SseEvent | null {
    switch (event.type) {
        case AGENT_EVENT_TYPE.THINKING_DELTA:
            return {
                event: SSE_EVENT_TYPE.THINKING_DELTA,
                data: { text: event.delta }
            }

        case AGENT_EVENT_TYPE.THINKING:
            return {
                event: SSE_EVENT_TYPE.THINKING,
                data: { text: event.thinking }
            }

        case AGENT_EVENT_TYPE.TOOL_CALL_START:
            return {
                event: SSE_EVENT_TYPE.TOOL_CALL_START,
                data: { id: event.toolCallId, name: event.toolName }
            }

        case AGENT_EVENT_TYPE.TOOL_CALL_DELTA:
            return {
                event: SSE_EVENT_TYPE.TOOL_CALL_DELTA,
                data: { id: event.toolCallId, arguments: event.argumentsDelta }
            }

        case AGENT_EVENT_TYPE.TOOL_CALL:
            return {
                event: SSE_EVENT_TYPE.TOOL_CALL,
                data: { toolCall: event.toolCall }
            }

        case AGENT_EVENT_TYPE.TOOL_RESULT:
            return {
                event: SSE_EVENT_TYPE.TOOL_RESULT,
                data: { toolResult: event.toolResult }
            }

        case AGENT_EVENT_TYPE.GUARDRAIL_REQUEST:
            return {
                event: SSE_EVENT_TYPE.GUARDRAIL_REQUEST,
                data: {
                    requestId: event.requestId,
                    context: event.context,
                    ...(event.reason !== undefined && { reason: event.reason })
                }
            }

        case AGENT_EVENT_TYPE.MESSAGE_DELTA:
            return {
                event: SSE_EVENT_TYPE.CONTENT_DELTA,
                data: { text: event.delta }
            }

        case AGENT_EVENT_TYPE.MESSAGE:
            return {
                event: SSE_EVENT_TYPE.CONTENT,
                data: { text: event.message }
            }

        case AGENT_EVENT_TYPE.HUMAN_INPUT:
            return {
                event: SSE_EVENT_TYPE.HUMAN_INPUT,
                data: { request: event.request }
            }

        case AGENT_EVENT_TYPE.ITERATION:
            return {
                event: SSE_EVENT_TYPE.ITERATION,
                data: {
                    ...(event.usage !== undefined && { usage: event.usage }),
                    ...(event.budgetState !== undefined && { budgetState: event.budgetState })
                }
            }

        case AGENT_EVENT_TYPE.PLAN:
            return {
                event: SSE_EVENT_TYPE.PLAN,
                data: { plan: event.plan }
            }

        case AGENT_EVENT_TYPE.STEP_STARTED:
            return {
                event: SSE_EVENT_TYPE.STEP_STARTED,
                data: { stepId: event.stepId, description: event.description }
            }

        case AGENT_EVENT_TYPE.STEP_COMPLETED:
            return {
                event: SSE_EVENT_TYPE.STEP_COMPLETED,
                data: { stepId: event.stepId, result: event.result }
            }

        case AGENT_EVENT_TYPE.STEP_FAILED:
            return {
                event: SSE_EVENT_TYPE.STEP_FAILED,
                data: { stepId: event.stepId, error: event.error }
            }

        case AGENT_EVENT_TYPE.ERROR:
            return {
                event: SSE_EVENT_TYPE.ERROR,
                data: { message: event.error }
            }

        case AGENT_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA:
            return {
                event: SSE_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA,
                data: { text: event.delta }
            }

        case AGENT_EVENT_TYPE.STRUCTURED_OUTPUT:
            return {
                event: SSE_EVENT_TYPE.STRUCTURED_OUTPUT,
                data: { output: event.output }
            }

        case AGENT_EVENT_TYPE.DONE:
            return {
                event: SSE_EVENT_TYPE.DONE,
                data: {}
            }

        default:
            return null
    }
}
