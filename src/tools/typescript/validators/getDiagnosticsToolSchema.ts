import { z } from 'zod'

export const getDiagnosticsToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript file to check'),
    tsconfigPath: z
        .string()
        .optional()
        .describe(
            'Path to tsconfig.json. If not provided, will be auto-discovered by traversing up from the file directory'
        )
})
