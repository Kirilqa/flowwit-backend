import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { LMSTUDIO_MODEL_TYPE_RESPONSE, LMStudioModelsResponse } from '../types'

const lmStudioModelTypeResponseSchema = z.union([
    z.literal(LMSTUDIO_MODEL_TYPE_RESPONSE.LLM),
    z.literal(LMSTUDIO_MODEL_TYPE_RESPONSE.VLM),
    z.literal(LMSTUDIO_MODEL_TYPE_RESPONSE.EMBEDDING)
])

export const lmStudioModelsResponseSchema: z.ZodType<LMStudioModelsResponse> = z
    .object({
        models: z.array(
            z.object({
                type: lmStudioModelTypeResponseSchema,
                key: z.string(),
                display_name: z.string().optional(),
                publisher: z.string().optional(),
                architecture: z.string().optional(),
                quantization: z
                    .object({
                        name: z.string(),
                        bits_per_weight: z.number()
                    })
                    .optional(),
                format: z.string().optional(),
                size_bytes: z.number().optional(),
                params_string: z.string().nullable().optional(),
                max_context_length: z.number().optional(),
                capabilities: z
                    .object({
                        vision: z.boolean(),
                        trained_for_tool_use: z.boolean()
                    })
                    .optional(),
                description: z.string().nullable().optional()
            })
        )
    })
    .transform(raw => stripUndefined(raw) as LMStudioModelsResponse)
