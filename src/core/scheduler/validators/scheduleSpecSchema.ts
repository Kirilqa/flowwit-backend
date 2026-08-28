import { z } from 'zod'
import { CronExpressionParser } from 'cron-parser'
import { stripUndefined } from '@core/utils'
import { SCHEDULE_SPEC_TYPE, ScheduleCronSpec } from '../types'

export const scheduleSpecSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal(SCHEDULE_SPEC_TYPE.ONCE), at: z.number() }),
    z
        .object({
            type: z.literal(SCHEDULE_SPEC_TYPE.CRON),
            expression: z.string().min(1),
            timezone: z.string().optional()
        })
        .refine(
            value => {
                try {
                    CronExpressionParser.parse(
                        value.expression,
                        value.timezone !== undefined ? { tz: value.timezone } : {}
                    )
                    return true
                } catch {
                    return false
                }
            },
            { message: 'Invalid cron expression' }
        )
        .transform(raw => stripUndefined(raw) as ScheduleCronSpec)
])
