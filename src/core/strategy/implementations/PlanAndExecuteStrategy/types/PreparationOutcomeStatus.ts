export const PREPARATION_OUTCOME_STATUS = {
    DIRECT_RESPONSE: 'direct_response',
    WAITING_FOR_USER: 'waiting_for_user',
    PROCEED_TO_PLAN: 'proceed_to_plan'
} as const

export type PreparationOutcomeStatus = (typeof PREPARATION_OUTCOME_STATUS)[keyof typeof PREPARATION_OUTCOME_STATUS]
