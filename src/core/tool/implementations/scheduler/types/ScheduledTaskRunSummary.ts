import { ScheduledDeliveryOutcome } from '@channel'
import { ScheduledTaskRunStatus } from '@scheduler'

export type ScheduledTaskRunSummary = {
    id: string
    taskId: string
    status: ScheduledTaskRunStatus
    startedAt: number
    completedAt?: number
    outcome?: ScheduledDeliveryOutcome
}
