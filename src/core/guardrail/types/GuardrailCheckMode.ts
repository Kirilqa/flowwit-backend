export const GUARDRAIL_CHECK_MODE = {
    STANDARD: 'standard',
    SKIP: 'skip',
    SAFE_SKIP: 'safe_skip',
    FAIL: 'fail'
} as const

export type GuardrailCheckMode = (typeof GUARDRAIL_CHECK_MODE)[keyof typeof GUARDRAIL_CHECK_MODE]
