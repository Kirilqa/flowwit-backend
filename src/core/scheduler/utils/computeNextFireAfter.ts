import { CronExpressionParser } from 'cron-parser'
import { SCHEDULE_SPEC_TYPE, ScheduleSpec } from '../types'

export function computeNextFireAfter(schedule: ScheduleSpec, after: number): number {
    if (schedule.type === SCHEDULE_SPEC_TYPE.ONCE) {
        return schedule.at > after ? schedule.at : Number.POSITIVE_INFINITY
    }

    const interval = CronExpressionParser.parse(schedule.expression, {
        currentDate: new Date(after + 1),
        ...(schedule.timezone !== undefined && { tz: schedule.timezone })
    })

    return interval.next().getTime()
}
