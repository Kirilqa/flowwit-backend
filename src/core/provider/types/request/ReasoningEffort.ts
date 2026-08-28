export const REASONING_EFFORT = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    XHIGH: 'xhigh'
} as const

export type ReasoningEffort = (typeof REASONING_EFFORT)[keyof typeof REASONING_EFFORT]
