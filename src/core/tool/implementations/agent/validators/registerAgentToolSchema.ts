import { z } from 'zod'

export const registerAgentToolSchema = z.object({
    agentId: z
        .string()
        .min(1)
        .describe('ID of the agent to register as a sub-agent. The agent must already exist in the system.')
})
