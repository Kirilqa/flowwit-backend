export const SCHEDULED_TASK_DESTINATION_TYPE = {
    SILENT: 'silent',
    TELEGRAM: 'telegram',
    WEB: 'web'
} as const

export type ScheduledTaskDestinationType =
    (typeof SCHEDULED_TASK_DESTINATION_TYPE)[keyof typeof SCHEDULED_TASK_DESTINATION_TYPE]

export type ScheduledTaskDestination =
    | { type: typeof SCHEDULED_TASK_DESTINATION_TYPE.SILENT }
    | { type: typeof SCHEDULED_TASK_DESTINATION_TYPE.TELEGRAM; chatId: number }
    | { type: typeof SCHEDULED_TASK_DESTINATION_TYPE.WEB; sessionId: string }
