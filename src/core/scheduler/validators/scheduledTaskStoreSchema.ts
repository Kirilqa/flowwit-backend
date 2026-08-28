import { z } from 'zod'
import { scheduledTaskSchema } from './scheduledTaskSchema'

export const scheduledTaskStoreSchema = z.object({
    tasks: z.array(scheduledTaskSchema)
})
