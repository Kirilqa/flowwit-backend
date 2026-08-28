import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const searchMemoryToolSchema = z.object({
    query: z.string().min(1).describe('Search terms to look for in previously saved memory'),
    scope: z
        .enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
        .optional()
        .describe('Restrict the search to one scope. If omitted, searches global, agent and project scopes together.')
})
