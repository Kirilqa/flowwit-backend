import { z } from 'zod'

export const getSymbolToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript or JavaScript file'),
    symbolName: z.string().describe('Name of the symbol to retrieve (function, class, method, interface, type, enum)')
})
