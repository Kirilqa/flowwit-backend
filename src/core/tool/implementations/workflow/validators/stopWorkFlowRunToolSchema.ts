import { z } from 'zod'

export const stopWorkFlowRunToolSchema = z.object({
    runId: z.string().min(1).describe('ID of the workflow run to stop')
})
