import { z } from 'zod'

export const deleteWorkFlowToolSchema = z.object({
    workflowId: z.string().min(1).describe('ID of the workflow to delete')
})
