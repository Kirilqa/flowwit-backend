import { computeNextFireAfter, SCHEDULE_SPEC_TYPE, ScheduleSpec } from '@scheduler'

export function computeInitialNextFireAt(schedule: ScheduleSpec): number {
    return schedule.type === SCHEDULE_SPEC_TYPE.ONCE ? schedule.at : computeNextFireAfter(schedule, Date.now())
}
