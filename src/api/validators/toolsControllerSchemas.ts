import { z } from 'zod'

export const toolParamsSchema = z.object({
    name: z.string()
})
