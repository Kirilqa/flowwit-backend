import { z } from 'zod'

export const scheduledTaskOutcomeSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('skip') }),
    z.object({ action: z.literal('respond'), message: z.string() })
])
