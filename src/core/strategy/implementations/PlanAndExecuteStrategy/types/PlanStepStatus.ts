export const PLAN_STEP_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed'
} as const

export type PlanStepStatus = (typeof PLAN_STEP_STATUS)[keyof typeof PLAN_STEP_STATUS]
