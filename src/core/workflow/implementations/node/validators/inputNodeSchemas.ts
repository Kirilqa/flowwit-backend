import { z } from 'zod'

export const inputNodeInputSchema = z.unknown()

export const inputNodeOutputsSchema = z.object({
    result: z.unknown()
})
