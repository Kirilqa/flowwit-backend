export const SCHEDULED_TASK_GUARDRAIL_POLICY = {
    SAFE_SKIP: 'safe_skip',
    FAIL: 'fail'
} as const

export type ScheduledTaskGuardrailPolicy =
    (typeof SCHEDULED_TASK_GUARDRAIL_POLICY)[keyof typeof SCHEDULED_TASK_GUARDRAIL_POLICY]
