import { z } from 'zod'

export const searchInFileToolSchema = z.object({
    path: z.string().describe('Path to a file (not a directory). Must point to a single file'),
    query: z.string().describe('Search query — plain string or regular expression pattern'),
    isRegex: z.boolean().default(false).describe('Whether to treat query as a regular expression'),
    contextLines: z.number().int().min(0).max(20).default(2).describe('Number of lines to include around each match')
})
