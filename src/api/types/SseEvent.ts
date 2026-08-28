import { GuardrailRequestContext } from '@guardrail'
import { ToolCall, ToolResult, HumanInputRequest } from '@tool'
import { Plan } from '@strategy'
import { Usage } from '@provider'
import { BudgetState } from '@agent/budget'
import { SSE_EVENT_TYPE } from './SseEventType'

export type SessionCreatedSseEvent = {
    event: typeof SSE_EVENT_TYPE.SESSION_CREATED
    data: { sessionId: string }
}

export type ThinkingDeltaSseEvent = {
    event: typeof SSE_EVENT_TYPE.THINKING_DELTA
    data: { text: string }
}

export type ThinkingSseEvent = {
    event: typeof SSE_EVENT_TYPE.THINKING
    data: { text: string }
}

export type ToolCallStartSseEvent = {
    event: typeof SSE_EVENT_TYPE.TOOL_CALL_START
    data: { id: string; name: string }
}

export type ToolCallDeltaSseEvent = {
    event: typeof SSE_EVENT_TYPE.TOOL_CALL_DELTA
    data: { id: string; arguments: string }
}

export type ToolCallSseEvent = {
    event: typeof SSE_EVENT_TYPE.TOOL_CALL
    data: { toolCall: ToolCall }
}

export type ToolResultSseEvent = {
    event: typeof SSE_EVENT_TYPE.TOOL_RESULT
    data: { toolResult: ToolResult }
}

export type GuardrailRequestSseEvent = {
    event: typeof SSE_EVENT_TYPE.GUARDRAIL_REQUEST
    data: { requestId: string; context: GuardrailRequestContext; reason?: string }
}

export type ContentDeltaSseEvent = {
    event: typeof SSE_EVENT_TYPE.CONTENT_DELTA
    data: { text: string }
}

export type ContentSseEvent = {
    event: typeof SSE_EVENT_TYPE.CONTENT
    data: { text: string }
}

export type HumanInputSseEvent = {
    event: typeof SSE_EVENT_TYPE.HUMAN_INPUT
    data: { request: HumanInputRequest }
}

export type IterationSseEvent = {
    event: typeof SSE_EVENT_TYPE.ITERATION
    data: {
        usage?: Usage
        budgetState?: BudgetState
    }
}

export type PlanSseEvent = {
    event: typeof SSE_EVENT_TYPE.PLAN
    data: { plan: Plan }
}

export type StepStartedSseEvent = {
    event: typeof SSE_EVENT_TYPE.STEP_STARTED
    data: { stepId: string; description: string }
}

export type StepCompletedSseEvent = {
    event: typeof SSE_EVENT_TYPE.STEP_COMPLETED
    data: { stepId: string; result: string }
}

export type StepFailedSseEvent = {
    event: typeof SSE_EVENT_TYPE.STEP_FAILED
    data: { stepId: string; error: string }
}

export type ErrorSseEvent = {
    event: typeof SSE_EVENT_TYPE.ERROR
    data: { message: string }
}

export type StructuredOutputDeltaSseEvent = {
    event: typeof SSE_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA
    data: { text: string }
}

export type StructuredOutputSseEvent = {
    event: typeof SSE_EVENT_TYPE.STRUCTURED_OUTPUT
    data: { output: unknown }
}

export type DoneSseEvent = {
    event: typeof SSE_EVENT_TYPE.DONE
    data: { usage?: Usage }
}

export type SseEvent =
    | SessionCreatedSseEvent
    | ThinkingDeltaSseEvent
    | ThinkingSseEvent
    | ToolCallStartSseEvent
    | ToolCallDeltaSseEvent
    | ToolCallSseEvent
    | ToolResultSseEvent
    | GuardrailRequestSseEvent
    | ContentDeltaSseEvent
    | ContentSseEvent
    | HumanInputSseEvent
    | IterationSseEvent
    | PlanSseEvent
    | StepStartedSseEvent
    | StepCompletedSseEvent
    | StepFailedSseEvent
    | ErrorSseEvent
    | StructuredOutputDeltaSseEvent
    | StructuredOutputSseEvent
    | DoneSseEvent
