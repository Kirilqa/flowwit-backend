import { z } from 'zod'

export const getTypeAtPositionToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript file'),
    line: z.number().int().min(1).describe('Line number (1-based)'),
    column: z.number().int().min(1).describe('Column number (1-based)'),
    tsconfigPath: z
        .string()
        .optional()
        .describe(
            'Path to tsconfig.json. If not provided, will be auto-discovered by traversing up from the file directory'
        )
})
