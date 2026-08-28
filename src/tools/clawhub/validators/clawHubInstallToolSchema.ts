import { z } from 'zod'

export const clawHubInstallToolSchema = z.object({
    slug: z.string().min(1).describe('Skill slug to install, e.g. "gifgrep" or "owner/skill-name"'),
    version: z.string().optional().describe('Specific version to install. Installs latest if not provided.')
})
