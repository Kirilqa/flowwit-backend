import { z } from 'zod'

export const registerWorkFlowToolSchema = z.object({
    workflowId: z
        .string()
        .min(1)
        .describe('ID of the workflow to register. The workflow must already exist in the system.')
})
