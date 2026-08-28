export const PROGRESS_EVALUATION_STATUS = {
    FAILED: 'failed',
    INCOMPLETE: 'incomplete',
    WAITING_FOR_USER: 'waiting_for_user'
} as const

export type ProgressEvaluationStatus = (typeof PROGRESS_EVALUATION_STATUS)[keyof typeof PROGRESS_EVALUATION_STATUS]
