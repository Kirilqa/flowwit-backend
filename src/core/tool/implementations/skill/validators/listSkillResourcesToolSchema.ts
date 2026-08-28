import { z } from 'zod'

export const listSkillResourcesToolSchema = z.object({
    skillName: z.string().min(1).describe('Skill name to list resources for')
})
