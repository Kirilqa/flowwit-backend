import { z } from 'zod'

export const moveToolSchema = z.object({
    source: z.string().describe('Path to the file or directory to move'),
    destination: z.string().describe('Destination path')
})
