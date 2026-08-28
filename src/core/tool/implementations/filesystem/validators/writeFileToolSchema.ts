import { z } from 'zod'

export const writeFileToolSchema = z.object({
    path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Text content to write to the file')
})
