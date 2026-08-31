export const OLLAMA_REASONING_EFFORT_REQUEST = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    XHIGH: 'xhigh'
} as const

export type OllamaReasoningEffortRequest =
    (typeof OLLAMA_REASONING_EFFORT_REQUEST)[keyof typeof OLLAMA_REASONING_EFFORT_REQUEST]
