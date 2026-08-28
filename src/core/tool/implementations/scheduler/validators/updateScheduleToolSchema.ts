import { z } from 'zod'
import { scheduleSpecSchema, scheduledTaskExecutionSchema, scheduledTaskDestinationSchema } from '@scheduler'

export const updateScheduleToolSchema = z.object({
    taskId: z.string().min(1).describe('ID of the scheduled task to update'),
    schedule: scheduleSpecSchema.optional().describe('New schedule — replaces the existing one entirely'),
    execution: scheduledTaskExecutionSchema.optional().describe('New execution — replaces the existing one entirely'),
    destination: scheduledTaskDestinationSchema
        .optional()
        .describe('New destination — replaces the existing one entirely')
})
