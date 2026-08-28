import { z } from 'zod'

export const findReferencesToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript file containing the symbol'),
    symbolName: z
        .string()
        .describe(
            'Name of the symbol to find references for (function, class, method, variable, interface, type, enum)'
        ),
    tsconfigPath: z
        .string()
        .optional()
        .describe(
            'Path to tsconfig.json. If not provided, will be auto-discovered by traversing up from the file directory'
        )
})
