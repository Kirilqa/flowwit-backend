import { z } from 'zod'
import { workFlowEntrySchema, workFlowConnectionSchema } from './workFlowGraphSchemas'

export const createWorkFlowToolSchema = z.object({
    name: z.string().min(1).describe('Human-readable name for the workflow'),
    description: z.string().optional().describe('Optional description of what this workflow does'),
    entries: z.array(workFlowEntrySchema).min(1).describe('Node instances that make up the workflow graph'),
    connections: z
        .array(workFlowConnectionSchema)
        .describe('Directed edges connecting node output ports to node input ports')
})
