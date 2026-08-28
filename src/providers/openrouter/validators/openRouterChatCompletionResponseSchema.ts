import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { OPENROUTER_FINISH_REASON_RESPONSE, OpenRouterChatCompletionResponse } from '../types'

const openRouterToolCallSchema = z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
        name: z.string(),
        arguments: z.string()
    })
})

const openRouterFinishReasonResponseSchema = z.union([
    z.literal(OPENROUTER_FINISH_REASON_RESPONSE.STOP),
    z.literal(OPENROUTER_FINISH_REASON_RESPONSE.LENGTH),
    z.literal(OPENROUTER_FINISH_REASON_RESPONSE.TOOL_CALLS),
    z.literal(OPENROUTER_FINISH_REASON_RESPONSE.CONTENT_FILTER),
    z.null()
])

const openRouterTopLogprobResponseSchema = z.object({
    token: z.string(),
    logprob: z.number(),
    bytes: z.array(z.number()).nullable()
})

const openRouterTokenLogprobResponseSchema = z.object({
    token: z.string(),
    logprob: z.number(),
    bytes: z.array(z.number()).nullable(),
    top_logprobs: z.array(openRouterTopLogprobResponseSchema)
})

export const openRouterChatCompletionResponseSchema: z.ZodType<OpenRouterChatCompletionResponse> = z
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
                    tool_calls: z.array(openRouterToolCallSchema).optional(),
                    reasoning_content: z.string().nullable().optional()
                }),
                finish_reason: openRouterFinishReasonResponseSchema,
                logprobs: z
                    .object({
                        content: z.array(openRouterTokenLogprobResponseSchema).nullable()
                    })
                    .nullable()
                    .optional()
            })
        ),
        usage: z.object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number(),
            prompt_tokens_details: z
                .object({
                    cached_tokens: z.number().optional(),
                    cache_write_tokens: z.number().optional(),
                    audio_tokens: z.number().optional(),
                    video_tokens: z.number().optional()
                })
                .optional(),
            completion_tokens_details: z
                .object({
                    reasoning_tokens: z.number().optional(),
                    audio_tokens: z.number().optional(),
                    image_tokens: z.number().optional()
                })
                .optional(),
            cost: z.number().optional(),
            is_byok: z.boolean().optional()
        }),
        system_fingerprint: z.string().nullable().optional()
    })
    .transform(raw => stripUndefined(raw) as OpenRouterChatCompletionResponse)
