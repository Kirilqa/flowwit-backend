import { z } from 'zod'

export const clawHubSkillInfoToolSchema = z.object({
    slug: z.string().min(1).describe('Skill slug to get details for, e.g. "gifgrep" or "owner/skill-name"')
})
