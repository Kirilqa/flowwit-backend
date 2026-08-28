import { z } from 'zod'

export const humanInputToolSchema = z.object({
    question: z.string().describe('The question to ask the user'),
    options: z
        .array(
            z.object({
                value: z.string(),
                label: z.string()
            })
        )
        .optional()
        .describe('Optional list of predefined options for the user to choose from'),
    timeoutMs: z.number().optional().describe('How long to wait for user response in milliseconds')
})
