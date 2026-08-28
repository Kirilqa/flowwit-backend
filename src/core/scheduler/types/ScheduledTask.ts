import { ScheduleSpec } from './ScheduleSpec'
import { ScheduledTaskExecution } from './ScheduledTaskExecution'
import { ScheduledTaskDestination } from './ScheduledTaskDestination'

export type ScheduledTask = {
    id: string
    schedule: ScheduleSpec
    execution: ScheduledTaskExecution
    destination: ScheduledTaskDestination
    nextFireAt: number
    enabled: boolean
}
