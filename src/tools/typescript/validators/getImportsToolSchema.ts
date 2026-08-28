import { z } from 'zod'

export const getImportsToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript or JavaScript file')
})
