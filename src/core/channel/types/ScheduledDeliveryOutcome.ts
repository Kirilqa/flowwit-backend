export const SCHEDULED_DELIVERY_OUTCOME_TYPE = {
    SKIP: 'skip',
    MESSAGE: 'message',
    ERROR: 'error'
} as const

export type ScheduledDeliveryOutcomeType =
    (typeof SCHEDULED_DELIVERY_OUTCOME_TYPE)[keyof typeof SCHEDULED_DELIVERY_OUTCOME_TYPE]

export type ScheduledDeliveryOutcome =
    | { type: typeof SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP }
    | { type: typeof SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE; text: string }
    | { type: typeof SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR; text: string }
