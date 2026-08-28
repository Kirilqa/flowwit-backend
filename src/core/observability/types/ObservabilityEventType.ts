export const OBSERVABILITY_EVENT_TYPE = {
    GUARDRAIL_INPUT: 'guardrail-input',
    GUARDRAIL_TOOL: 'guardrail-tool',
    GUARDRAIL_OUTPUT: 'guardrail-output',
    SESSION_OPTIMIZED: 'session-optimized',
    TOOL_POOL_BUILT: 'tool-pool-built',
    THINKING: 'thinking',
    MESSAGE: 'message',
    TOOL_CALL: 'tool-call',
    TOOL_RESULT: 'tool-result',
    ITERATION: 'iteration',
    DONE: 'done',
    ERROR: 'error'
} as const

export type ObservabilityEventType = (typeof OBSERVABILITY_EVENT_TYPE)[keyof typeof OBSERVABILITY_EVENT_TYPE]
