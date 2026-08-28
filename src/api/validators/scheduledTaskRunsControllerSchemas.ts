import { z } from 'zod'
import { SCHEDULED_TASK_RUN_STATUS } from '@scheduler'

export const scheduledTaskRunParamsSchema = z.object({
    runId: z.string()
})

export const listScheduledTaskRunsQuerySchema = z.object({
    taskId: z.string().optional(),
    status: z.enum(SCHEDULED_TASK_RUN_STATUS).optional()
})
