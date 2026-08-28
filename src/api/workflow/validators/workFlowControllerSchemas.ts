import { z } from 'zod'

export const workflowParamsSchema = z.object({
    workflowId: z.string()
})

export const startRunBodySchema = z.object({
    input: z.unknown().optional(),
    workflow: z
        .object({
            entries: z.array(z.unknown()),
            connections: z.array(z.unknown())
        })
        .optional()
})
