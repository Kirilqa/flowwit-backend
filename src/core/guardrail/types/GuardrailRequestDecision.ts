export const GUARDRAIL_REQUEST_DECISION = {
    APPROVE: 'approve',
    APPROVE_ALWAYS: 'approve_always',
    DENY: 'deny',
    DENY_ALWAYS: 'deny_always',
    ABORTED: 'aborted'
} as const

export type GuardrailRequestDecision = (typeof GUARDRAIL_REQUEST_DECISION)[keyof typeof GUARDRAIL_REQUEST_DECISION]
