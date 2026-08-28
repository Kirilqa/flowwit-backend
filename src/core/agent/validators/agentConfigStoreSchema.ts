import { z } from 'zod'

export const agentConfigStoreSchema = z.object({
    agents: z.array(z.unknown())
})
