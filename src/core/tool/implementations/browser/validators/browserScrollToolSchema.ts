import { z } from 'zod'

export const browserScrollToolSchema = z.object({
    direction: z.enum(['up', 'down', 'left', 'right']).describe('Direction to scroll'),
    amount: z
        .number()
        .positive()
        .optional()
        .describe('Amount of pixels to scroll. If omitted, scrolls by one viewport height/width'),
    selector: z.string().optional().describe('CSS selector of the element to scroll. If omitted, scrolls the page')
})
