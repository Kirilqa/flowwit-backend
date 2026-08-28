import { z } from 'zod'

export const unregisterSkillToolSchema = z.object({
    skillName: z.string().min(1).describe('Name of the skill to unregister.')
})
