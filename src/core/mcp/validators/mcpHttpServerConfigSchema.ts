import { z } from 'zod'

export const mcpHttpServerConfigSchema = z.object({
    type: z.union([z.literal('streamable-http'), z.literal('sse')]).default('streamable-http'),
    url: z.url(),
    headers: z.record(z.string(), z.string()).optional()
})
