import { z } from 'zod'

export const mcpAliasParamsSchema = z.object({ alias: z.string() })

const mcpStdioBodySchema = z.object({
    name: z.string().min(1),
    type: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional()
})

const mcpHttpBodySchema = z.object({
    name: z.string().min(1),
    type: z.union([z.literal('streamable-http'), z.literal('sse')]),
    url: z.url(),
    headers: z.record(z.string(), z.string()).optional()
})

export const mcpBodySchema = z.discriminatedUnion('type', [mcpStdioBodySchema, mcpHttpBodySchema])
