export const STEP_EXECUTION_OUTCOME_STATUS = {
    COMPLETED: 'completed',
    FAILED: 'failed',
    WAITING_FOR_USER: 'waiting_for_user'
} as const

export type StepExecutionOutcomeStatus =
    (typeof STEP_EXECUTION_OUTCOME_STATUS)[keyof typeof STEP_EXECUTION_OUTCOME_STATUS]
