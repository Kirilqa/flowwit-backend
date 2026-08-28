import { z } from 'zod'

export const infoWorkFlowRunToolSchema = z.object({
    runId: z.string().min(1).describe('ID of the workflow run to inspect')
})
