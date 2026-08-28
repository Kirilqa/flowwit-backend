import { z } from 'zod'

export const createDirectoryToolSchema = z.object({
    path: z.string().describe('Path of the directory to create')
})
