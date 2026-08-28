import { z } from 'zod'

export const browserEvaluateToolSchema = z.object({
    script: z
        .string()
        .describe(
            'JavaScript code to execute in the browser context. Must be a valid JS expression or function body that returns a value'
        ),
    arg: z
        .unknown()
        .optional()
        .describe('Optional argument to pass to the script. Available as the first argument in the script')
})
