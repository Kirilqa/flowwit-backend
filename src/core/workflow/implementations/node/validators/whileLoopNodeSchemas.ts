import { z } from 'zod'

export const whileLoopNodePortsSchema = z.object({
    value: z.unknown().optional(),
    loop: z.unknown().optional()
})

export const whileLoopNodeOutputsSchema = z.object({
    loop: z.unknown().optional(),
    done: z.unknown().optional()
})

export const whileLoopNodeConfigSchema = z.object({
    condition: z.boolean()
})
