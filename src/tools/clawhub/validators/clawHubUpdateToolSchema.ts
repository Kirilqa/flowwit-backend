import { z } from 'zod'

export const clawHubUpdateToolSchema = z.object({
    slug: z.string().min(1).describe('Skill slug to update, e.g. "gifgrep" or "owner/skill-name"'),
    version: z.string().optional().describe('Specific version to update to. Updates to latest if not provided.')
})
