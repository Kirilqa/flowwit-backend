import { z } from 'zod'

export const runSkillResourceToolSchema = z.object({
    skillName: z.string().min(1).describe('Skill name whose script to run'),
    relativePath: z
        .string()
        .min(1)
        .describe(
            'Relative path to the script within the skill directory, must be under "scripts/", e.g. "scripts/build.py"'
        ),
    args: z.array(z.string()).optional().describe('Command-line arguments to pass to the script'),
    timeoutMs: z.number().optional().describe('Timeout in milliseconds. Defaults to 120000 (2 minutes)')
})
