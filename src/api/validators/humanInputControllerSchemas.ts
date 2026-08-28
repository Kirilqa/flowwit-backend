import { z } from 'zod'

export const humanInputParamsSchema = z.object({
    sessionId: z.string()
})

export const humanInputBodySchema = z.object({
    answer: z.string().min(1)
})
