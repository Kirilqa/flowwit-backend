import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { LMSTUDIO_FINISH_REASON_RESPONSE, LMStudioChatCompletionResponse } from '../types'

const lmStudioToolCallSchema = z.object({
    id: z.string(),
    index: z.number().optional(),
    type: z.literal('function'),
    function: z.object({
        name: z.string(),
        arguments: z.string()
    })
})

const lmStudioFinishReasonResponseSchema = z.union([
    z.literal(LMSTUDIO_FINISH_REASON_RESPONSE.STOP),
    z.literal(LMSTUDIO_FINISH_REASON_RESPONSE.LENGTH),
    z.literal(LMSTUDIO_FINISH_REASON_RESPONSE.TOOL_CALLS),
    z.null()
])

export const lmStudioChatCompletionResponseSchema: z.ZodType<LMStudioChatCompletionResponse> = z
    .object({
        id: z.string(),
        object: z.literal('chat.completion'),
        created: z.number(),
        model: z.string(),
        choices: z.array(
            z.object({
                index: z.number(),
                message: z.object({
                    role: z.literal('assistant'),
                    content: z.string().nullable(),
                    tool_calls: z.array(lmStudioToolCallSchema).optional()
                }),
                finish_reason: lmStudioFinishReasonResponseSchema
            })
        ),
        usage: z.object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number()
        }),
        system_fingerprint: z.string().optional()
    })
    .transform(raw => stripUndefined(raw) as LMStudioChatCompletionResponse)
