import { z } from 'zod'

export const copyToolSchema = z.object({
    source: z.string().describe('Path to the file or directory to copy'),
    destination: z.string().describe('Destination path for the copied file or directory')
})
