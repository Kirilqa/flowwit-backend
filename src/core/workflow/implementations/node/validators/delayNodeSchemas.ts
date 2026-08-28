import { z } from 'zod'

export const delayNodePortsSchema = z.object({
    value: z.unknown()
})

export const delayNodeOutputsSchema = z.object({
    result: z.unknown()
})

export const delayNodeConfigSchema = z.object({
    delayMs: z.number().default(1000)
})
