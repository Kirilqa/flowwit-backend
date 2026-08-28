import { z } from 'zod'

export const toolNodePortsSchema = z.object({
    args: z.record(z.string(), z.unknown())
})

export const toolNodeOutputsSchema = z.object({
    result: z.unknown()
})

export const toolNodeConfigSchema = z.object({
    toolName: z.string()
})
