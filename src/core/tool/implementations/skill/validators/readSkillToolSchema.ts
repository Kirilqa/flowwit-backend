import { z } from 'zod'

export const readSkillToolSchema = z.object({
    name: z.string().min(1).describe('Skill name to read')
})
