import { z } from 'zod'

export const clawHubSkillVersionsToolSchema = z.object({
    slug: z.string().min(1).describe('Skill slug to get versions for'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of versions to return')
})
