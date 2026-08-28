export const FINISH_REASON = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls',
    CONTENT_FILTER: 'content_filter',
    ERROR: 'error'
} as const

export type FinishReason = (typeof FINISH_REASON)[keyof typeof FINISH_REASON]
