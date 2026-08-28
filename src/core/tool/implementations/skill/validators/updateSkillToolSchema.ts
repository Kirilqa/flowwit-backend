import { z } from 'zod'

export const updateSkillToolSchema = z.object({
    name: z.string().min(1).describe('Skill name to update'),
    description: z.string().min(1).optional().describe('New description'),
    content: z.string().min(1).optional().describe('New skill instructions in markdown format'),
    license: z.string().optional().describe('License identifier, e.g. MIT'),
    compatibility: z.string().optional().describe('Compatibility notes, e.g. supported OS or environment'),
    allowedTools: z.array(z.string()).optional().describe('List of tool names this skill is allowed to use'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata key-value pairs')
})
