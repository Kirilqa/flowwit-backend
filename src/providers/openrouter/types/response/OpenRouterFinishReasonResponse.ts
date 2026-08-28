export const OPENROUTER_FINISH_REASON_RESPONSE = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls',
    CONTENT_FILTER: 'content_filter'
} as const

export type OpenRouterFinishReasonResponse =
    (typeof OPENROUTER_FINISH_REASON_RESPONSE)[keyof typeof OPENROUTER_FINISH_REASON_RESPONSE] | null
