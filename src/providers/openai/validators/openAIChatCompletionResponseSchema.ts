import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { OPENAI_FINISH_REASON_RESPONSE, OpenAIChatCompletionResponse } from '../types'

const openAIToolCallSchema = z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
        name: z.string(),
        arguments: z.string()
    })
})

const openAIFinishReasonResponseSchema = z.union([
    z.literal(OPENAI_FINISH_REASON_RESPONSE.STOP),
    z.literal(OPENAI_FINISH_REASON_RESPONSE.LENGTH),
    z.literal(OPENAI_FINISH_REASON_RESPONSE.TOOL_CALLS),
    z.literal(OPENAI_FINISH_REASON_RESPONSE.CONTENT_FILTER),
    z.null()
])

const openAITopLogprobResponseSchema = z.object({
    token: z.string(),
    logprob: z.number(),
    bytes: z.array(z.number()).nullable()
})

const openAITokenLogprobResponseSchema = z.object({
    token: z.string(),
    logprob: z.number(),
    bytes: z.array(z.number()).nullable(),
    top_logprobs: z.array(openAITopLogprobResponseSchema)
})

export const openAIChatCompletionResponseSchema: z.ZodType<OpenAIChatCompletionResponse> = z
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
                    tool_calls: z.array(openAIToolCallSchema).optional(),
                    reasoning_content: z.string().nullable().optional()
                }),
                finish_reason: openAIFinishReasonResponseSchema,
                logprobs: z
                    .object({
                        content: z.array(openAITokenLogprobResponseSchema).nullable()
                    })
                    .optional()
            })
        ),
        usage: z.object({
            prompt_tokens: z.number(),
            completion_tokens: z.number(),
            total_tokens: z.number(),
            prompt_tokens_details: z.object({ cached_tokens: z.number().optional() }).optional(),
            completion_tokens_details: z.object({ reasoning_tokens: z.number().optional() }).optional()
        }),
        system_fingerprint: z.string().optional()
    })
    .transform(raw => stripUndefined(raw) as OpenAIChatCompletionResponse)
