import { z } from 'zod'
import { GUARDRAIL_RULE_DECISION } from '@guardrail'

export const guardrailRuleParamsSchema = z.object({
    guardrailId: z.string(),
    ruleKey: z.string()
})

export const guardrailIdParamsSchema = z.object({
    guardrailId: z.string()
})

export const guardrailRuleBodySchema = z.object({
    decision: z.enum([GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS, GUARDRAIL_RULE_DECISION.DENY_ALWAYS])
})
