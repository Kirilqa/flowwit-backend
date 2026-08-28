import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { browserClickToolSchema } from './validators'

export class BrowserClickTool extends BaseBrowserTool<typeof browserClickToolSchema> {
    readonly name = 'browser_click'
    readonly description = 'Clicks on an element identified by a CSS selector'
    readonly schema = browserClickToolSchema

    protected async run(
        args: z.infer<typeof browserClickToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const page = await this.getPage(sessionId)

        await page.click(args.selector, {
            ...(args.button !== undefined && { button: args.button }),
            ...(args.clickCount !== undefined && { clickCount: args.clickCount }),
            ...(args.delay !== undefined && { delay: args.delay }),
            ...(args.timeoutMs !== undefined && { timeout: args.timeoutMs })
        })

        return `Clicked on element "${args.selector}"`
    }
}
