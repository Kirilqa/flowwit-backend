import { z } from 'zod'

export const clawHubSearchToolSchema = z.object({
    query: z.string().min(1).describe('Search query to find skills on ClawHub'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results to return')
})
