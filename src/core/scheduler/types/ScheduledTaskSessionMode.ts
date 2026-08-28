export const SCHEDULED_TASK_SESSION_MODE = {
    EPHEMERAL: 'ephemeral',
    PERSISTENT: 'persistent'
} as const

export type ScheduledTaskSessionMode = (typeof SCHEDULED_TASK_SESSION_MODE)[keyof typeof SCHEDULED_TASK_SESSION_MODE]
