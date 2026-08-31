export const OLLAMA_MESSAGE_ROLE = {
    SYSTEM: 'system',
    DEVELOPER: 'developer',
    USER: 'user',
    ASSISTANT: 'assistant',
    TOOL: 'tool'
} as const

export type OllamaMessageRole = (typeof OLLAMA_MESSAGE_ROLE)[keyof typeof OLLAMA_MESSAGE_ROLE]
