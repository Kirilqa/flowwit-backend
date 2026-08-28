import { z } from 'zod'

export const runWorkFlowToolSchema = z.object({
    workflowId: z.string().min(1).describe('ID of the workflow to run'),
    input: z.unknown().optional().describe('Input data passed to the workflow start nodes')
})
