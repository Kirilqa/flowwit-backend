import { z } from 'zod'

export const readFileToolSchema = z.object({
    path: z.string().describe('Path to the file to read')
})
