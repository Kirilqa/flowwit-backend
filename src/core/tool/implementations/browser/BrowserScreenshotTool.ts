import fs from 'fs/promises'
import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { BrowserManager } from './BrowserManager'
import { BrowserPageOptions, BrowserScreenshotOptions, BrowserScreenshotResult } from './types'
import { browserScreenshotToolSchema } from './validators'

export class BrowserScreenshotTool extends BaseBrowserTool<typeof browserScreenshotToolSchema> {
    readonly name = 'browser_screenshot'
    readonly description = `Captures a screenshot of the current page or a specific element (via "selector"), always returns it as base64, and only saves to disk if "savePath" is explicitly provided.`
    readonly schema = browserScreenshotToolSchema

    private readonly defaultOptions: BrowserScreenshotOptions | undefined

    constructor(
        manager: BrowserManager,
        pageOptions?: BrowserPageOptions,
        screenshotOptions?: BrowserScreenshotOptions
    ) {
        super(manager, pageOptions)

        if (screenshotOptions !== undefined) {
            this.defaultOptions = screenshotOptions
        }
    }

    protected async run(
        args: z.infer<typeof browserScreenshotToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<BrowserScreenshotResult> {
        const page = await this.getPage(sessionId)
        const format = args.format ?? this.defaultOptions?.format ?? 'png'

        let buffer: Buffer

        const isJpeg = format === 'jpeg'

        if (args.selector) {
            buffer = await page.locator(args.selector).screenshot({
                type: format,
                ...(isJpeg && args.quality !== undefined && { quality: args.quality }),
                ...(args.omitBackground !== undefined && { omitBackground: args.omitBackground }),
                ...(args.scale !== undefined && { scale: args.scale })
            })
        } else {
            buffer = await page.screenshot({
                type: format,
                ...(args.fullPage !== undefined && { fullPage: args.fullPage }),
                ...(isJpeg && args.quality !== undefined && { quality: args.quality }),
                ...(args.omitBackground !== undefined && { omitBackground: args.omitBackground }),
                ...(args.scale !== undefined && { scale: args.scale }),
                ...(args.clip !== undefined && { clip: args.clip })
            })
        }

        if (args.savePath !== undefined) {
            await fs.writeFile(args.savePath, buffer)
        }

        return {
            format,
            savedTo: args.savePath ?? null,
            data: buffer.toString('base64')
        }
    }
}
