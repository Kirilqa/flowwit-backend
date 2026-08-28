import { z } from 'zod'

export const browserWaitToolSchema = z.object({
    selector: z
        .string()
        .optional()
        .describe('CSS selector of the element to wait for. If omitted, waits for the specified duration'),
    state: z
        .enum(['attached', 'detached', 'visible', 'hidden'])
        .optional()
        .describe('State to wait for when using selector. Default: visible'),
    duration: z
        .number()
        .positive()
        .optional()
        .describe('Duration to wait in milliseconds. Used when no selector is provided'),
    timeoutMs: z
        .number()
        .nonnegative()
        .optional()
        .describe('Maximum time to wait for the element in milliseconds. Default: 30000')
})
