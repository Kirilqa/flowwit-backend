export const OLLAMA_FINISH_REASON_RESPONSE = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls'
} as const

export type OllamaFinishReasonResponse =
    (typeof OLLAMA_FINISH_REASON_RESPONSE)[keyof typeof OLLAMA_FINISH_REASON_RESPONSE] | null
