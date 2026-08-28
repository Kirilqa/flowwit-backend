import { z } from 'zod'

export const deleteSkillToolSchema = z.object({
    name: z.string().min(1).describe('Skill name to delete')
})
