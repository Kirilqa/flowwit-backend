export const STRATEGY_DECISION = {
    THINKING_DELTA: 'thinking_delta',
    THINKING: 'thinking',
    MESSAGE_DELTA: 'message_delta',
    MESSAGE: 'message',
    TOOL_CALL_START: 'tool_call_start',
    TOOL_CALL_DELTA: 'tool_call_delta',
    TOOL_CALL: 'tool_call',
    PLAN: 'plan',
    STEP_STARTED: 'step_started',
    STEP_COMPLETED: 'step_completed',
    STEP_FAILED: 'step_failed',
    ITERATION: 'iteration',
    DONE: 'done'
} as const

export type StrategyDecisionType = (typeof STRATEGY_DECISION)[keyof typeof STRATEGY_DECISION]
