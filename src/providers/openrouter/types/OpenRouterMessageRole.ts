export const OPENROUTER_MESSAGE_ROLE = {
    SYSTEM: 'system',
    DEVELOPER: 'developer',
    USER: 'user',
    ASSISTANT: 'assistant',
    TOOL: 'tool'
} as const

export type OpenRouterMessageRole = (typeof OPENROUTER_MESSAGE_ROLE)[keyof typeof OPENROUTER_MESSAGE_ROLE]
