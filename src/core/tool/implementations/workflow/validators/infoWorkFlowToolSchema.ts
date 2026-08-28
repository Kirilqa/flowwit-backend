import { z } from 'zod'

export const infoWorkFlowToolSchema = z.object({
    workflowId: z.string().min(1).describe('ID of the workflow to inspect')
})
