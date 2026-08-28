import { z } from 'zod'
import { scheduleSpecSchema, scheduledTaskExecutionSchema, scheduledTaskDestinationSchema } from '@scheduler'

export const createScheduleToolSchema = z.object({
    schedule: scheduleSpecSchema.describe('When the task fires — once at a timestamp, or on a cron expression'),
    execution: scheduledTaskExecutionSchema.describe('What runs — an agent prompt or a workflow'),
    destination: scheduledTaskDestinationSchema.describe(
        'Where the result goes — silent, a Telegram chat, or a web session'
    )
})
