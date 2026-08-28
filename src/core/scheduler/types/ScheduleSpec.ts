export const SCHEDULE_SPEC_TYPE = {
    ONCE: 'once',
    CRON: 'cron'
} as const

export type ScheduleSpecType = (typeof SCHEDULE_SPEC_TYPE)[keyof typeof SCHEDULE_SPEC_TYPE]

export type ScheduleOnceSpec = { type: typeof SCHEDULE_SPEC_TYPE.ONCE; at: number }

export type ScheduleCronSpec = { type: typeof SCHEDULE_SPEC_TYPE.CRON; expression: string; timezone?: string }

export type ScheduleSpec = ScheduleOnceSpec | ScheduleCronSpec
