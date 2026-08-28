import { z } from 'zod'
import { workFlowEntrySchema, workFlowConnectionSchema } from './workFlowGraphSchemas'

export const updateWorkFlowToolSchema = z.object({
    workflowId: z.string().min(1).describe('ID of the workflow to update'),
    name: z.string().min(1).optional().describe('New workflow name'),
    description: z.string().optional().describe('New description'),
    entries: z
        .array(workFlowEntrySchema)
        .min(1)
        .optional()
        .describe('New node list — replaces existing nodes entirely'),
    connections: z
        .array(workFlowConnectionSchema)
        .optional()
        .describe('New connection list — replaces existing connections entirely')
})
