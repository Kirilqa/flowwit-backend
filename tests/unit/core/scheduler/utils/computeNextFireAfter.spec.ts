import { computeNextFireAfter } from '@scheduler/utils/computeNextFireAfter'
import { SCHEDULE_SPEC_TYPE, ScheduleSpec } from '@scheduler/types'

describe('computeNextFireAfter', () => {
    describe('once', () => {
        it('returns the scheduled time when it is still in the future', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.ONCE, at: 2000 }
            expect(computeNextFireAfter(schedule, 1000)).toBe(2000)
        })

        it('returns Infinity when the scheduled time has already passed', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.ONCE, at: 1000 }
            expect(computeNextFireAfter(schedule, 2000)).toBe(Number.POSITIVE_INFINITY)
        })

        it('returns Infinity when the scheduled time equals after', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.ONCE, at: 1000 }
            expect(computeNextFireAfter(schedule, 1000)).toBe(Number.POSITIVE_INFINITY)
        })
    })

    describe('cron', () => {
        it('returns the next matching boundary strictly after "after"', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.CRON, expression: '*/30 * * * * *' }
            const after = Date.UTC(2026, 0, 1, 0, 0, 10)
            const result = computeNextFireAfter(schedule, after)
            expect(result).toBe(Date.UTC(2026, 0, 1, 0, 0, 30))
        })

        it('rolls over to the next boundary when after lands exactly on a fire time', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.CRON, expression: '*/30 * * * * *' }
            const after = Date.UTC(2026, 0, 1, 0, 0, 30)
            const result = computeNextFireAfter(schedule, after)
            expect(result).toBe(Date.UTC(2026, 0, 1, 0, 1, 0))
        })

        it('is always strictly greater than after', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.CRON, expression: '0 0 9 1 * *' }
            const after = Date.UTC(2026, 2, 15, 12, 0, 0)
            const result = computeNextFireAfter(schedule, after)
            expect(result).toBeGreaterThan(after)
        })

        it('honors an explicit timezone, producing a different result than another timezone', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.CRON, expression: '0 0 9 * * *' }
            const after = Date.UTC(2026, 5, 1, 0, 0, 0)

            const tokyo = computeNextFireAfter({ ...schedule, timezone: 'Asia/Tokyo' }, after)
            const newYork = computeNextFireAfter({ ...schedule, timezone: 'America/New_York' }, after)

            expect(tokyo).not.toBe(newYork)
            expect(tokyo).toBeGreaterThan(after)
            expect(newYork).toBeGreaterThan(after)
        })

        it('throws for an invalid cron expression', () => {
            const schedule: ScheduleSpec = { type: SCHEDULE_SPEC_TYPE.CRON, expression: 'not a cron expression' }
            expect(() => computeNextFireAfter(schedule, Date.now())).toThrow()
        })
    })
})
