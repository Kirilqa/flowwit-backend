export const LMSTUDIO_MESSAGE_ROLE = {
    SYSTEM: 'system',
    DEVELOPER: 'developer',
    USER: 'user',
    ASSISTANT: 'assistant',
    TOOL: 'tool'
} as const

export type LMStudioMessageRole = (typeof LMSTUDIO_MESSAGE_ROLE)[keyof typeof LMSTUDIO_MESSAGE_ROLE]
