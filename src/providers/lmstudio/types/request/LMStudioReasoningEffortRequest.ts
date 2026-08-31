export const LMSTUDIO_REASONING_EFFORT_REQUEST = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    XHIGH: 'xhigh'
} as const

export type LMStudioReasoningEffortRequest =
    (typeof LMSTUDIO_REASONING_EFFORT_REQUEST)[keyof typeof LMSTUDIO_REASONING_EFFORT_REQUEST]
