import { z } from 'zod'
import { OpenAIModelsListResponse } from '../types'

export const openAIModelsListResponseSchema: z.ZodType<OpenAIModelsListResponse> = z.object({
    object: z.literal('list'),
    data: z.array(
        z.object({
            id: z.string(),
            object: z.literal('model'),
            created: z.number(),
            owned_by: z.string()
        })
    )
})
