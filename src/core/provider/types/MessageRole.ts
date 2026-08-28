export const MESSAGE_ROLE = {
    SYSTEM: 'system',
    DEVELOPER: 'developer',
    USER: 'user',
    ASSISTANT: 'assistant',
    TOOL_RESULT: 'tool_result'
} as const

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE]
