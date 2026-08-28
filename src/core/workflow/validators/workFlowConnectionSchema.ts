import { z } from 'zod'
import { WorkFlowConnection } from '../types/WorkFlowConnection'

export const workFlowConnectionSchema: z.ZodType<WorkFlowConnection> = z.object({
    id: z.string().min(1),
    sourceNodeId: z.string(),
    sourcePort: z.string(),
    targetNodeId: z.string(),
    targetPort: z.string()
})
