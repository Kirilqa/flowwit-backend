import { z } from 'zod'

export const writeSkillResourceToolSchema = z.object({
    skillName: z.string().min(1).describe('Skill name to write resource for'),
    relativePath: z
        .string()
        .min(1)
        .describe('Relative path to the resource file within the skill directory, e.g. "examples/usage.ts"'),
    content: z.string().describe('File content to write')
})
