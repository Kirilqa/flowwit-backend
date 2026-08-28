import { z } from 'zod'

export const unregisterWorkFlowToolSchema = z.object({
    workflowId: z.string().min(1).describe('ID of the workflow to unregister from your agent')
})
