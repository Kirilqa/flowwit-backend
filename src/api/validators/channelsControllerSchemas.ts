import { z } from 'zod'

export const channelParamsSchema = z.object({
    id: z.string()
})

export const updateSettingsBodySchema = z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
