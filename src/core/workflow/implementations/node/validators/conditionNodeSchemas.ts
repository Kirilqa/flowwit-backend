import { z } from 'zod'

export const conditionNodePortsSchema = z.object({
    value: z.unknown()
})

export const conditionNodeOutputsSchema = z.object({
    true: z.unknown().optional(),
    false: z.unknown().optional()
})

export const conditionNodeConfigSchema = z.object({
    condition: z.boolean()
})
