import { z } from 'zod'

export const registerSkillToolSchema = z.object({
    skillName: z
        .string()
        .min(1)
        .describe('Name of the skill to register. The skill must already be available in the system skill registry.')
})
