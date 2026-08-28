import { Usage } from '@provider'
import { ToolCall } from '@tool'
import { Plan } from '../implementations/PlanAndExecuteStrategy/types/Plan'
import { STRATEGY_DECISION } from './StrategyDecisionType'

export type ThinkingDeltaDecision = {
    type: typeof STRATEGY_DECISION.THINKING_DELTA
    delta: string
}

export type ThinkingDecision = {
    type: typeof STRATEGY_DECISION.THINKING
    thinking: string
}

export type MessageDeltaDecision = {
    type: typeof STRATEGY_DECISION.MESSAGE_DELTA
    delta: string
}

export type MessageDecision = {
    type: typeof STRATEGY_DECISION.MESSAGE
    content: string
}

export type ToolCallStartDecision = {
    type: typeof STRATEGY_DECISION.TOOL_CALL_START
    toolCallId: string
    toolName: string
}

export type ToolCallDeltaDecision = {
    type: typeof STRATEGY_DECISION.TOOL_CALL_DELTA
    toolCallId: string
    argumentsDelta: string
}

export type ToolCallDecision = {
    type: typeof STRATEGY_DECISION.TOOL_CALL
    toolCall: ToolCall
}

export type PlanDecision = {
    type: typeof STRATEGY_DECISION.PLAN
    plan: Plan
}

export type StepStartedDecision = {
    type: typeof STRATEGY_DECISION.STEP_STARTED
    stepId: string
    description: string
}

export type StepCompletedDecision = {
    type: typeof STRATEGY_DECISION.STEP_COMPLETED
    stepId: string
    result: string
}

export type StepFailedDecision = {
    type: typeof STRATEGY_DECISION.STEP_FAILED
    stepId: string
    error: string
}

export type IterationDecision = {
    type: typeof STRATEGY_DECISION.ITERATION
    usage?: Usage
}

export type DoneDecision = {
    type: typeof STRATEGY_DECISION.DONE
}

export type StrategyDecision =
    | ThinkingDeltaDecision
    | ThinkingDecision
    | MessageDeltaDecision
    | MessageDecision
    | ToolCallStartDecision
    | ToolCallDeltaDecision
    | ToolCallDecision
    | PlanDecision
    | StepStartedDecision
    | StepCompletedDecision
    | StepFailedDecision
    | IterationDecision
    | DoneDecision
