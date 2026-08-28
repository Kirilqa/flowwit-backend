import { z } from 'zod'

export const forLoopNodePortsSchema = z.object({
    value: z.unknown().optional(),
    loop: z.unknown().optional()
})

export const forLoopNodeOutputsSchema = z.object({
    loop: z.unknown().optional(),
    done: z.unknown().optional()
})

export const forLoopNodeConfigSchema = z.object({
    iterations: z.number().int().min(1)
})

export const forLoopNodeStateSchema = z.object({
    iteration: z.number().int().default(0)
})
