import { Usage } from '@provider'
import { GuardrailAction } from '@guardrail'
import { ToolCall, ToolResult } from '@tool'
import { OBSERVABILITY_EVENT_TYPE } from './ObservabilityEventType'
import { BudgetState } from '@agent/budget'

export type ObservabilityEventBase = {
    id: string
    agentId: string
    sessionId: string
    createdAt: number
}

export type GuardrailInputObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.GUARDRAIL_INPUT
    guardrailName: string
    action: GuardrailAction
    reason?: string
}

export type GuardrailToolObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.GUARDRAIL_TOOL
    guardrailName: string
    toolName: string
    action: GuardrailAction
    reason?: string
}

export type GuardrailOutputObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.GUARDRAIL_OUTPUT
    guardrailName: string
    action: GuardrailAction
    reason?: string
}

export type SessionOptimizedObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.SESSION_OPTIMIZED
}

export type ToolPoolBuiltObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.TOOL_POOL_BUILT
    toolCount: number
}

export type ThinkingObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.THINKING
    thinking: string
}

export type MessageObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.MESSAGE
    message: string
}

export type ToolCallObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.TOOL_CALL
    toolCall: ToolCall
}

export type ToolResultObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.TOOL_RESULT
    toolResult: ToolResult
}

export type IterationObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.ITERATION
    usage?: Usage
    budgetState?: BudgetState
}

export type DoneObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.DONE
}

export type ErrorObservabilityEvent = ObservabilityEventBase & {
    type: typeof OBSERVABILITY_EVENT_TYPE.ERROR
    error: string
}

export type ObservabilityEvent =
    | GuardrailInputObservabilityEvent
    | GuardrailToolObservabilityEvent
    | GuardrailOutputObservabilityEvent
    | SessionOptimizedObservabilityEvent
    | ToolPoolBuiltObservabilityEvent
    | ThinkingObservabilityEvent
    | MessageObservabilityEvent
    | ToolCallObservabilityEvent
    | ToolResultObservabilityEvent
    | IterationObservabilityEvent
    | DoneObservabilityEvent
    | ErrorObservabilityEvent
