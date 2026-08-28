import { z } from 'zod'

export const providerParamsSchema = z.object({
    name: z.string()
})
