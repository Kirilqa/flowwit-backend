import { z } from 'zod'

export const mcpToolNodePortsSchema = z.object({
    args: z.record(z.string(), z.unknown())
})

export const mcpToolNodeOutputsSchema = z.object({
    result: z.unknown()
})

export const mcpToolNodeConfigSchema = z.object({
    serverAlias: z.string(),
    toolName: z.string()
})
