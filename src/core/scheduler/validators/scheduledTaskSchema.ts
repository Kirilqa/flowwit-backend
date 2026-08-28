import { z } from 'zod'
import { scheduleSpecSchema } from './scheduleSpecSchema'
import { scheduledTaskExecutionSchema } from './scheduledTaskExecutionSchema'
import { scheduledTaskDestinationSchema } from './scheduledTaskDestinationSchema'

export const scheduledTaskSchema = z.object({
    id: z.string().min(1),
    schedule: scheduleSpecSchema,
    execution: scheduledTaskExecutionSchema,
    destination: scheduledTaskDestinationSchema,
    nextFireAt: z.number(),
    enabled: z.boolean()
})
