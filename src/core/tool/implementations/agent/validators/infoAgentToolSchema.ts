import { z } from 'zod'

export const infoAgentToolSchema = z.object({
    agentId: z.string().min(1).describe('ID of the agent to get info about')
})
