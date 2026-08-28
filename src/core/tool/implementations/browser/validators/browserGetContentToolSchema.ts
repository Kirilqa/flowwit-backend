import { z } from 'zod'

export const browserGetContentToolSchema = z.object({
    selector: z
        .string()
        .optional()
        .describe('CSS selector to get content of a specific element. If omitted, returns content of the entire page'),
    format: z.enum(['text', 'html', 'markdown']).optional().describe('Format of the returned content. Default: text')
})
