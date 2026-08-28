import { scheduleSpecSchema } from '@scheduler/validators/scheduleSpecSchema'
import { SCHEDULE_SPEC_TYPE } from '@scheduler'

describe('scheduleSpecSchema', () => {
    describe('once spec', () => {
        it('accepts a valid once spec', () => {
            const result = scheduleSpecSchema.safeParse({ type: SCHEDULE_SPEC_TYPE.ONCE, at: 1000 })
            expect(result.success).toBe(true)
        })

        it('rejects a once spec missing "at"', () => {
            const result = scheduleSpecSchema.safeParse({ type: SCHEDULE_SPEC_TYPE.ONCE })
            expect(result.success).toBe(false)
        })
    })

    describe('cron spec', () => {
        it('accepts a valid cron expression', () => {
            const result = scheduleSpecSchema.safeParse({
                type: SCHEDULE_SPEC_TYPE.CRON,
                expression: '*/30 * * * * *'
            })
            expect(result.success).toBe(true)
        })

        it('accepts a valid cron expression with a timezone', () => {
            const result = scheduleSpecSchema.safeParse({
                type: SCHEDULE_SPEC_TYPE.CRON,
                expression: '0 0 * * *',
                timezone: 'Europe/Moscow'
            })
            expect(result.success).toBe(true)
            if (!result.success) throw new Error()
            if (result.data.type !== SCHEDULE_SPEC_TYPE.CRON) throw new Error()
            expect(result.data.timezone).toBe('Europe/Moscow')
        })

        it('strips undefined timezone from the parsed result', () => {
            const result = scheduleSpecSchema.safeParse({
                type: SCHEDULE_SPEC_TYPE.CRON,
                expression: '0 0 * * *'
            })
            expect(result.success).toBe(true)
            if (!result.success) throw new Error()
            expect('timezone' in result.data).toBe(false)
        })

        it('rejects an invalid cron expression', () => {
            const result = scheduleSpecSchema.safeParse({
                type: SCHEDULE_SPEC_TYPE.CRON,
                expression: 'not a cron expression'
            })
            expect(result.success).toBe(false)
            if (result.success) throw new Error()
            expect(result.error.issues[0]?.message).toBe('Invalid cron expression')
        })

        it('rejects an empty cron expression', () => {
            const result = scheduleSpecSchema.safeParse({ type: SCHEDULE_SPEC_TYPE.CRON, expression: '' })
            expect(result.success).toBe(false)
        })
    })

    it('rejects an unknown discriminant type', () => {
        const result = scheduleSpecSchema.safeParse({ type: 'unknown' })
        expect(result.success).toBe(false)
    })
})
