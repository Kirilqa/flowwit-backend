import TurndownService from 'turndown'
import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { BrowserManager } from './BrowserManager'
import { BrowserPageOptions } from './types'
import { browserGetContentToolSchema } from './validators'

export class BrowserGetContentTool extends BaseBrowserTool<typeof browserGetContentToolSchema> {
    readonly name = 'browser_get_content'
    readonly description =
        'Returns the content of the current page or a specific element. Use text format for reading, html for scraping, markdown for structured content'
    readonly schema = browserGetContentToolSchema

    private readonly turndown: TurndownService

    constructor(manager: BrowserManager, pageOptions?: BrowserPageOptions) {
        super(manager, pageOptions)
        this.turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    }

    protected async run(
        args: z.infer<typeof browserGetContentToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const page = await this.getPage(sessionId)
        const format = args.format ?? 'text'

        let output: string

        if (format === 'text') {
            output = args.selector
                ? await page.locator(args.selector).innerText()
                : await page.evaluate(() => document.body.innerText)
        } else {
            const html = args.selector ? await page.locator(args.selector).innerHTML() : await page.content()

            output = format === 'markdown' ? this.turndown.turndown(html) : html
        }

        return output
    }
}
