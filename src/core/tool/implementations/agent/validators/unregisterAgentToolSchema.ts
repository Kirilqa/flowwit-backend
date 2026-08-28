import { z } from 'zod'

export const unregisterAgentToolSchema = z.object({
    agentId: z.string().min(1).describe('ID of the sub-agent to unregister.')
})
