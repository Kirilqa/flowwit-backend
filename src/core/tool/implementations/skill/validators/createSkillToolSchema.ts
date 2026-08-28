import { z } from 'zod'

export const createSkillToolSchema = z.object({
    name: z.string().min(1).describe('Unique skill name, used as identifier'),
    description: z.string().min(1).describe('Short description of what the skill does'),
    content: z.string().min(1).describe('Full skill instructions in markdown format'),
    license: z.string().optional().describe('License identifier, e.g. MIT'),
    compatibility: z.string().optional().describe('Compatibility notes, e.g. supported OS or environment'),
    allowedTools: z.array(z.string()).optional().describe('List of tool names this skill is allowed to use'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata key-value pairs')
})
