import { z } from 'zod'
import { SCHEDULED_TASK_RUN_STATUS } from '@scheduler'

export const listScheduleRunsToolSchema = z.object({
    taskId: z.string().min(1).optional().describe('Filter runs by scheduled task ID'),
    status: z.enum(SCHEDULED_TASK_RUN_STATUS).optional().describe('Filter runs by status')
})
