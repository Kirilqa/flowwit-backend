import { z } from 'zod'

export const llmNodePortsSchema = z.object({
    prompt: z.string()
})

export const llmNodeOutputsSchema = z.object({
    text: z.string()
})

export const llmNodeConfigSchema = z.object({
    providerName: z.string(),
    model: z.string(),
    systemPrompt: z.string().optional(),
    messages: z.array(z.unknown()).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).optional()
})
