import { AgentEvent } from '@agent'
import { WorkFlowEvent } from '@workflow'
import { ScheduledDeliveryOutcome } from '@channel'
import { ScheduledTaskRunStatus } from './ScheduledTaskRunStatus'

export type ScheduledTaskRun = {
    id: string
    taskId: string
    status: ScheduledTaskRunStatus
    startedAt: number
    completedAt?: number
    events: Array<AgentEvent | WorkFlowEvent>
    outcome?: ScheduledDeliveryOutcome
}
