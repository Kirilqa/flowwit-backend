import { z } from 'zod'

export const sendMessageBodySchema = z.object({
    agentId: z.string(),
    content: z.string().min(1),
    sessionId: z.string().optional(),
    workingDirectory: z.string().optional(),
    temporary: z.boolean().optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional()
})
