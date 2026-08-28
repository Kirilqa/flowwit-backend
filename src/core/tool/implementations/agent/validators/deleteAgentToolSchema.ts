import { z } from 'zod'

export const deleteAgentToolSchema = z.object({
    agentId: z.string().min(1).describe('ID of the agent to delete')
})
