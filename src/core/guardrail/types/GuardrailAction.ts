export const GUARDRAIL_ACTION = {
    BLOCK: 'block',
    WARN: 'warn',
    ALLOW: 'allow'
} as const

export type GuardrailAction = (typeof GUARDRAIL_ACTION)[keyof typeof GUARDRAIL_ACTION]
