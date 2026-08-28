import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { BrowserNavigateResult } from './types'
import { browserNavigateToolSchema } from './validators'

export class BrowserNavigateTool extends BaseBrowserTool<typeof browserNavigateToolSchema> {
    readonly name = 'browser_navigate'
    readonly description = 'Navigates the browser to the specified URL'
    readonly schema = browserNavigateToolSchema

    protected async run(
        args: z.infer<typeof browserNavigateToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<BrowserNavigateResult> {
        const page = await this.getPage(sessionId)

        const response = await page.goto(args.url, {
            ...(args.waitUntil !== undefined && { waitUntil: args.waitUntil })
        })

        return {
            url: page.url(),
            status: response?.status() ?? null,
            statusText: response?.statusText() ?? null
        }
    }
}
