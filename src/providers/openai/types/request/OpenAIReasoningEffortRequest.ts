export const OPENAI_REASONING_EFFORT_REQUEST = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    XHIGH: 'xhigh'
} as const

export type OpenAIReasoningEffortRequest =
    (typeof OPENAI_REASONING_EFFORT_REQUEST)[keyof typeof OPENAI_REASONING_EFFORT_REQUEST]
