export const SSE_EVENT_TYPE = {
    SESSION_CREATED: 'session_created',
    THINKING_DELTA: 'thinking_delta',
    THINKING: 'thinking',
    TOOL_CALL_START: 'tool_call_start',
    TOOL_CALL_DELTA: 'tool_call_delta',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    GUARDRAIL_REQUEST: 'guardrail_request',
    CONTENT_DELTA: 'content_delta',
    CONTENT: 'content',
    HUMAN_INPUT: 'human_input',
    ITERATION: 'iteration',
    PLAN: 'plan',
    STEP_STARTED: 'step_started',
    STEP_COMPLETED: 'step_completed',
    STEP_FAILED: 'step_failed',
    ERROR: 'error',
    STRUCTURED_OUTPUT_DELTA: 'structured_output_delta',
    STRUCTURED_OUTPUT: 'structured_output',
    DONE: 'done'
} as const

export type SseEventType = (typeof SSE_EVENT_TYPE)[keyof typeof SSE_EVENT_TYPE]
