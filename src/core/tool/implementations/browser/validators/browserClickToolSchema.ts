import { z } from 'zod'

export const browserClickToolSchema = z.object({
    selector: z.string().describe('CSS selector of the element to click'),
    button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button to use. Default: left'),
    clickCount: z.number().int().positive().optional().describe('Number of clicks. Default: 1'),
    delay: z
        .number()
        .nonnegative()
        .optional()
        .describe('Delay between mousedown and mouseup in milliseconds. Default: 0'),
    timeoutMs: z
        .number()
        .nonnegative()
        .optional()
        .describe('Maximum time to wait for the element in milliseconds. Default: 30000')
})
