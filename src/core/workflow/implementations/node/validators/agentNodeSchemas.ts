import { z } from 'zod'
import { GUARDRAIL_CHECK_MODE } from '@guardrail'

export const agentNodePortsSchema = z.object({
    prompt: z.string()
})

export const agentNodeOutputsSchema = z.object({
    result: z.object({
        message: z.string(),
        messages: z.array(z.unknown()),
        usage: z.unknown()
    })
})

const guardrailCheckModeSchema = z.enum([
    GUARDRAIL_CHECK_MODE.STANDARD,
    GUARDRAIL_CHECK_MODE.SKIP,
    GUARDRAIL_CHECK_MODE.SAFE_SKIP,
    GUARDRAIL_CHECK_MODE.FAIL
])

const guardrailPolicySchema = z.object({
    input: guardrailCheckModeSchema.optional(),
    output: guardrailCheckModeSchema.optional(),
    toolCall: guardrailCheckModeSchema.optional()
})

export const agentNodeConfigSchema = z.object({
    agentId: z.string(),
    systemPrompt: z.string().optional(),
    messages: z.array(z.unknown()).optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
    guardrailPolicy: guardrailPolicySchema.optional()
})
