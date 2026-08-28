import { z } from 'zod'

export const jsonStringifyNodePortsSchema = z.object({
    value: z.unknown()
})

export const jsonStringifyNodeOutputsSchema = z.object({
    result: z.string()
})

export const jsonStringifyNodeConfigSchema = z.object({
    indent: z.number().int().min(0).max(8).default(0)
})
