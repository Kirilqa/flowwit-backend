import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { OllamaTagsResponse } from '../types'

export const ollamaTagsResponseSchema: z.ZodType<OllamaTagsResponse> = z
    .object({
        models: z.array(
            z.object({
                name: z.string(),
                model: z.string(),
                modified_at: z.string(),
                size: z.number(),
                digest: z.string(),
                details: z.object({
                    parent_model: z.string().optional(),
                    format: z.string().optional(),
                    family: z.string().optional(),
                    families: z.array(z.string()).nullable().optional(),
                    parameter_size: z.string().optional(),
                    quantization_level: z.string().optional(),
                    context_length: z.number().optional(),
                    embedding_length: z.number().optional()
                }),
                capabilities: z.array(z.string())
            })
        )
    })
    .transform(raw => stripUndefined(raw) as OllamaTagsResponse)
