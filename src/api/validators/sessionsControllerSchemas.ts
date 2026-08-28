import { z } from 'zod'

export const sessionParamsSchema = z.object({
    sessionId: z.string()
})

export const workingDirectoryBodySchema = z.object({
    directory: z.string().min(1)
})
