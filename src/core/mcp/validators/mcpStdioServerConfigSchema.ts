import { z } from 'zod'

export const mcpStdioServerConfigSchema = z.object({
    type: z.literal('stdio').default('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional()
})
