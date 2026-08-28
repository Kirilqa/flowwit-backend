import { z } from 'zod'

export const listDirectoryToolSchema = z.object({
    path: z.string().describe('Path to the directory to list'),
    recursive: z
        .boolean()
        .optional()
        .describe(
            'If true, returns the full directory tree including all subdirectories. If false or omitted, returns only the immediate contents'
        )
})
