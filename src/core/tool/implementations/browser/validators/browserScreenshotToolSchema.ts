import { z } from 'zod'

export const browserScreenshotToolSchema = z.object({
    selector: z
        .string()
        .optional()
        .describe('CSS selector of the element to screenshot. If omitted, screenshots the entire page'),
    fullPage: z
        .boolean()
        .optional()
        .describe(
            'If true, takes a screenshot of the full scrollable page. Ignored if selector is provided. Default: false'
        ),
    format: z.enum(['png', 'jpeg']).optional().describe('Image format. Default: png'),
    quality: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('Image quality from 0 to 100. Only applicable for jpeg format, ignored for png'),
    omitBackground: z
        .boolean()
        .optional()
        .describe(
            'If true, hides the default white background and allows capturing screenshots with transparency. Only applicable for png format. Default: false'
        ),
    scale: z.enum(['css', 'device']).optional().describe('Whether to use css or device pixels. Default: css'),
    clip: z
        .object({
            x: z.number().describe('X coordinate of the top-left corner'),
            y: z.number().describe('Y coordinate of the top-left corner'),
            width: z.number().positive().describe('Width of the clip area'),
            height: z.number().positive().describe('Height of the clip area')
        })
        .optional()
        .describe('Clip area of the screenshot. Cannot be used together with selector'),
    savePath: z
        .string()
        .optional()
        .describe('Path to save the screenshot to disk. If omitted, returns base64 encoded image only')
})
