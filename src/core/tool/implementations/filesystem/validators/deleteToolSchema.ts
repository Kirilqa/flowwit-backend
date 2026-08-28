import { z } from 'zod'

export const deleteToolSchema = z.object({
    path: z.string().describe('Path to the file or directory to delete')
})
