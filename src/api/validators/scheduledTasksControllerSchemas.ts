import { z } from 'zod'
import { scheduleSpecSchema, scheduledTaskExecutionSchema, scheduledTaskDestinationSchema } from '@scheduler'

export const taskParamsSchema = z.object({
    taskId: z.string()
})

export const taskBodySchema = z.object({
    schedule: scheduleSpecSchema,
    execution: scheduledTaskExecutionSchema,
    destination: scheduledTaskDestinationSchema
})
