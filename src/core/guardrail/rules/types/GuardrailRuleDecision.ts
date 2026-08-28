export const GUARDRAIL_RULE_DECISION = {
    APPROVE_ALWAYS: 'approve_always',
    DENY_ALWAYS: 'deny_always'
} as const

export type GuardrailRuleDecision = (typeof GUARDRAIL_RULE_DECISION)[keyof typeof GUARDRAIL_RULE_DECISION]
