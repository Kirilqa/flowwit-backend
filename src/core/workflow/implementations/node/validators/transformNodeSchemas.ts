import { z } from 'zod'

export const transformNodePortsSchema = z.object({
    value: z.unknown()
})

export const transformNodeOutputsSchema = z.object({
    result: z.unknown()
})

export const transformNodeConfigSchema = z.object({
    expression: z.string()
})
