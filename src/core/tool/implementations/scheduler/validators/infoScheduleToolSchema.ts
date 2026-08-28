import { z } from 'zod'

export const infoScheduleToolSchema = z.object({
    taskId: z.string().min(1).describe('ID of the scheduled task to inspect')
})
