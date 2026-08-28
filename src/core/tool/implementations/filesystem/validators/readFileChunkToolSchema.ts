import { z } from 'zod'

export const readFileChunkToolSchema = z.object({
    path: z.string().describe('Path to the file to read'),
    fromLine: z.number().int().min(1).describe('Start line number (1-based, inclusive)'),
    toLine: z.number().int().min(1).describe('End line number (1-based, inclusive)')
})
