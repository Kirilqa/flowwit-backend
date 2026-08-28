import { z } from 'zod'

export const readSkillResourceToolSchema = z.object({
    skillName: z.string().min(1).describe('Skill name to read resource from'),
    relativePath: z
        .string()
        .min(1)
        .describe('Relative path to the resource file within the skill directory, e.g. "examples/usage.ts"')
})
