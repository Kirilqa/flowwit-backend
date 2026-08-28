export const AGENT_STATUS = {
    IDLE: 'idle',
    RUNNING: 'running',
    WAITING_FOR_TOOL: 'waiting_for_tool',
    WAITING_FOR_HUMAN: 'waiting_for_human',
    PAUSED: 'paused',
    DONE: 'done',
    ERROR: 'error'
} as const

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS]
