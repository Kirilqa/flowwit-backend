import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { OpenRouterModelsListResponse } from '../types'

export const openRouterModelsListResponseSchema: z.ZodType<OpenRouterModelsListResponse> = z
    .object({
        data: z.array(
            z.object({
                id: z.string(),
                canonical_slug: z.string(),
                name: z.string(),
                created: z.number(),
                description: z.string(),
                context_length: z.number(),
                architecture: z.object({
                    input_modalities: z.array(z.string()),
                    output_modalities: z.array(z.string()),
                    tokenizer: z.string(),
                    instruct_type: z.string().nullable()
                }),
                pricing: z.object({
                    prompt: z.string(),
                    completion: z.string(),
                    request: z.string().optional(),
                    image: z.string().optional(),
                    web_search: z.string().optional(),
                    internal_reasoning: z.string().optional(),
                    input_cache_read: z.string().optional(),
                    input_cache_write: z.string().optional()
                }),
                top_provider: z
                    .object({
                        context_length: z.number().nullable(),
                        max_completion_tokens: z.number().nullable(),
                        is_moderated: z.boolean()
                    })
                    .nullable(),
                supported_parameters: z.array(z.string()),
                default_parameters: z.record(z.string(), z.unknown()).nullable(),
                expiration_date: z.string().nullable()
            })
        )
    })
    .transform(raw => stripUndefined(raw) as OpenRouterModelsListResponse)
