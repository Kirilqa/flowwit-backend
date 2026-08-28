import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const listMemoriesToolSchema = z.object({
    scope: z
        .enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
        .optional()
        .describe('Restrict the listing to one scope. If omitted, lists global, agent and project scopes together.')
})
