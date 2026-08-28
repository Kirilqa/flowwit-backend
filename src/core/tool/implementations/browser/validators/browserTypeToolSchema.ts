import { z } from 'zod'

export const browserTypeToolSchema = z.object({
    selector: z.string().describe('CSS selector of the input element'),
    text: z.string().describe('Text to type into the element'),
    delay: z
        .number()
        .nonnegative()
        .optional()
        .describe('Delay between key presses in milliseconds. Useful for emulating real user typing. Default: 0'),
    clear: z.boolean().optional().describe('If true, clears the input before typing. Default: false'),
    timeoutMs: z
        .number()
        .nonnegative()
        .optional()
        .describe('Maximum time to wait for the element in milliseconds. Default: 30000')
})
