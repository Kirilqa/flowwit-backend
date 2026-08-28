import { z } from 'zod'
import { GUARDRAIL_REQUEST_DECISION } from '@guardrail'

export const guardrailConfirmParamsSchema = z.object({
    requestId: z.string()
})

export const guardrailConfirmBodySchema = z.object({
    decision: z.enum([
        GUARDRAIL_REQUEST_DECISION.APPROVE,
        GUARDRAIL_REQUEST_DECISION.DENY,
        GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS,
        GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS
    ])
})
