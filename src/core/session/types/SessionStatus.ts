export const SESSION_STATUS = {
    IDLE: 'idle',
    RUNNING: 'running',
    WAITING_FOR_TOOL: 'waiting_for_tool',
    WAITING_FOR_HUMAN: 'waiting_for_human',
    PAUSED: 'paused',
    DONE: 'done',
    ERROR: 'error'
} as const

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS]
