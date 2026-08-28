export const OPENROUTER_REASONING_EFFORT_REQUEST = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    XHIGH: 'xhigh'
} as const

export type OpenRouterReasoningEffortRequest =
    (typeof OPENROUTER_REASONING_EFFORT_REQUEST)[keyof typeof OPENROUTER_REASONING_EFFORT_REQUEST]
