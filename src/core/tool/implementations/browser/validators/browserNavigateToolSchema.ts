import { z } from 'zod'

export const browserNavigateToolSchema = z.object({
    url: z.string().describe('The URL to navigate to'),
    waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
        .optional()
        .describe('When to consider navigation as finished. Default: load')
})
