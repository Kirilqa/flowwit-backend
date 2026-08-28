import { z } from 'zod'

export const workFlowRunParamsSchema = z.object({
    runId: z.string()
})
