import { z } from 'zod'

export const infoChannelToolSchema = z.object({
    channelId: z.string().min(1).describe('Channel ID (e.g. "web", "telegram", "console")')
})
