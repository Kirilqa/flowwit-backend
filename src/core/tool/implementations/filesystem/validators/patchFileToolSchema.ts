import { z } from 'zod'

export const patchFileToolSchema = z.object({
    path: z.string().describe('Path to the file to patch'),
    fromLine: z.number().int().min(1).describe('Start line number to replace (1-based, inclusive)'),
    toLine: z.number().int().min(1).describe('End line number to replace (1-based, inclusive)'),
    content: z.string().describe('New content to replace the specified line range with')
})
