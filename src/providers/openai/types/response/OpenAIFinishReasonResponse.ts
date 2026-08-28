export const OPENAI_FINISH_REASON_RESPONSE = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls',
    CONTENT_FILTER: 'content_filter'
} as const

export type OpenAIFinishReasonResponse =
    (typeof OPENAI_FINISH_REASON_RESPONSE)[keyof typeof OPENAI_FINISH_REASON_RESPONSE] | null
