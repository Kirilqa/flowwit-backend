export const RUN_MODE = {
    SERVER: 'server',
    CHAT: 'chat'
} as const

export type RunMode = (typeof RUN_MODE)[keyof typeof RUN_MODE]
