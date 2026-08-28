import { z } from 'zod'
import { SCHEDULED_TASK_DESTINATION_TYPE } from '../types'

export const scheduledTaskDestinationSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal(SCHEDULED_TASK_DESTINATION_TYPE.SILENT) }),
    z.object({ type: z.literal(SCHEDULED_TASK_DESTINATION_TYPE.TELEGRAM), chatId: z.number() }),
    z.object({ type: z.literal(SCHEDULED_TASK_DESTINATION_TYPE.WEB), sessionId: z.string().min(1) })
])
