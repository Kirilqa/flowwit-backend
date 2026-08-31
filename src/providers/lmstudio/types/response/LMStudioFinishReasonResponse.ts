export const LMSTUDIO_FINISH_REASON_RESPONSE = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls'
} as const

export type LMStudioFinishReasonResponse =
    (typeof LMSTUDIO_FINISH_REASON_RESPONSE)[keyof typeof LMSTUDIO_FINISH_REASON_RESPONSE] | null
