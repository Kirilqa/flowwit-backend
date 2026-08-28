export const SCHEDULED_TASK_RUN_STATUS = {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    INTERRUPTED: 'interrupted'
} as const

export type ScheduledTaskRunStatus = (typeof SCHEDULED_TASK_RUN_STATUS)[keyof typeof SCHEDULED_TASK_RUN_STATUS]
