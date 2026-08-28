import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { browserTypeToolSchema } from './validators'

export class BrowserTypeTool extends BaseBrowserTool<typeof browserTypeToolSchema> {
    readonly name = 'browser_type'
    readonly description = 'Types text into an input element identified by a CSS selector'
    readonly schema = browserTypeToolSchema

    protected async run(
        args: z.infer<typeof browserTypeToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const page = await this.getPage(sessionId)

        if (args.clear) {
            await page.fill(args.selector, '', {
                ...(args.timeoutMs !== undefined && { timeout: args.timeoutMs })
            })
        }

        await page.locator(args.selector).pressSequentially(args.text, {
            ...(args.delay !== undefined && { delay: args.delay }),
            ...(args.timeoutMs !== undefined && { timeout: args.timeoutMs })
        })

        return `Typed "${args.text}" into element "${args.selector}"`
    }
}
