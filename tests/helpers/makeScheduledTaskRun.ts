import { ScheduledTaskRun, SCHEDULED_TASK_RUN_STATUS } from '@scheduler'

export function makeScheduledTaskRun(overrides: Partial<ScheduledTaskRun> = {}): ScheduledTaskRun {
    return {
        id: 'run-1',
        taskId: 'task-1',
        status: SCHEDULED_TASK_RUN_STATUS.RUNNING,
        startedAt: Date.now(),
        events: [],
        ...overrides
    }
}
