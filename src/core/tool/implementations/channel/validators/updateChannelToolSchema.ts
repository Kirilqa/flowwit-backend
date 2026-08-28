import { z } from 'zod'

export const updateChannelToolSchema = z.object({
    channelId: z.string().min(1).describe('Channel ID to configure (e.g. "web", "telegram", "console")'),
    settings: z
        .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
        .describe('Settings to apply. Use channel_info to see available keys and their types')
})
