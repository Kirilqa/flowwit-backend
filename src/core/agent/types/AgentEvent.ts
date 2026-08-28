import { Usage } from '@provider'
import { AGENT_EVENT_TYPE } from './AgentEventType'
import { HumanInputRequest } from '@tool'
import { ToolCall, ToolResult } from '@tool'
import { GuardrailRequestContext } from '@guardrail'
import { BudgetState } from '../budget'
import { Plan } from '@strategy'

export type AgentEventBase = {
    id: string
    agentId: string
    sessionId: string
    createdAt: number
}

export type ThinkingDeltaEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.THINKING_DELTA
    delta: string
}

export type ThinkingEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.THINKING
    thinking: string
}

export type ToolCallStartEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.TOOL_CALL_START
    toolCallId: string
    toolName: string
}

export type ToolCallDeltaEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.TOOL_CALL_DELTA
    toolCallId: string
    argumentsDelta: string
}

export type ToolCallEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.TOOL_CALL
    toolCall: ToolCall
}

export type ToolResultEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.TOOL_RESULT
    toolResult: ToolResult
}

export type GuardrailRequestEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.GUARDRAIL_REQUEST
    requestId: string
    reason?: string
    context: GuardrailRequestContext
}

export type SkillCallEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.SKILL_CALL
    skillName: string
    arguments: Record<string, unknown>
}

export type SkillResultEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.SKILL_RESULT
    skillName: string
    output: unknown
    isError: boolean
}

export type AgentCallEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.AGENT_CALL
    targetAgentId: string
    task: string
}

export type AgentResultEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.AGENT_RESULT
    targetAgentId: string
    output: unknown
    isError: boolean
}

export type MessageDeltaEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.MESSAGE_DELTA
    delta: string
}

export type MessageEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.MESSAGE
    message: string
}

export type PlanEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.PLAN
    plan: Plan
}

export type StepStartedEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.STEP_STARTED
    stepId: string
    description: string
}

export type StepCompletedEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.STEP_COMPLETED
    stepId: string
    result: string
}

export type StepFailedEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.STEP_FAILED
    stepId: string
    error: string
}

export type ErrorEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.ERROR
    error: string
    recoverable: boolean
}

export type HumanInputEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.HUMAN_INPUT
    request: HumanInputRequest
}

export type IterationEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.ITERATION
    usage?: Usage
    budgetState?: BudgetState
}

export type StructuredOutputDeltaEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA
    delta: string
}

export type StructuredOutputEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.STRUCTURED_OUTPUT
    output: unknown
}

export type DoneEvent = AgentEventBase & {
    type: typeof AGENT_EVENT_TYPE.DONE
    usage?: Usage
}

export type AgentEvent =
    | ThinkingDeltaEvent
    | ThinkingEvent
    | ToolCallStartEvent
    | ToolCallDeltaEvent
    | ToolCallEvent
    | ToolResultEvent
    | GuardrailRequestEvent
    | SkillCallEvent
    | SkillResultEvent
    | AgentCallEvent
    | AgentResultEvent
    | MessageDeltaEvent
    | MessageEvent
    | PlanEvent
    | StepStartedEvent
    | StepCompletedEvent
    | StepFailedEvent
    | ErrorEvent
    | HumanInputEvent
    | IterationEvent
    | StructuredOutputDeltaEvent
    | StructuredOutputEvent
    | DoneEvent
