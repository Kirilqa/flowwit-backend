import { z } from 'zod'

export const fileInfoToolSchema = z.object({
    path: z.string().describe('Path to the file or directory to inspect')
})
