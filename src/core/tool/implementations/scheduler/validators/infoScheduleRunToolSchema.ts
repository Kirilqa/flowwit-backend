import { z } from 'zod'

export const infoScheduleRunToolSchema = z.object({
    runId: z.string().min(1).describe('ID of the scheduled task run to inspect')
})
