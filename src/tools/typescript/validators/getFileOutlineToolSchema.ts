import { z } from 'zod'

export const getFileOutlineToolSchema = z.object({
    path: z.string().describe('Path to the TypeScript or JavaScript file')
})
