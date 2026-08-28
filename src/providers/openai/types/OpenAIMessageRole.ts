export const OPENAI_MESSAGE_ROLE = {
    SYSTEM: 'system',
    DEVELOPER: 'developer',
    USER: 'user',
    ASSISTANT: 'assistant',
    TOOL: 'tool'
} as const

export type OpenAIMessageRole = (typeof OPENAI_MESSAGE_ROLE)[keyof typeof OPENAI_MESSAGE_ROLE]
