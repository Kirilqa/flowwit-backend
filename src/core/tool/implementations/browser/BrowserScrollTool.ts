import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { browserScrollToolSchema } from './validators'

export class BrowserScrollTool extends BaseBrowserTool<typeof browserScrollToolSchema> {
    readonly name = 'browser_scroll'
    readonly description = 'Scrolls the page or a specific element in the specified direction'
    readonly schema = browserScrollToolSchema

    protected async run(
        args: z.infer<typeof browserScrollToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const page = await this.getPage(sessionId)

        const isHorizontal = args.direction === 'left' || args.direction === 'right'
        const isPositive = args.direction === 'right' || args.direction === 'down'
        const sign = isPositive ? 1 : -1

        if (args.selector) {
            await page.locator(args.selector).evaluate(
                (el, { amount, isHorizontal, sign }) => {
                    const delta = (amount ?? (isHorizontal ? el.clientWidth : el.clientHeight)) * sign
                    el.scrollBy(isHorizontal ? delta : 0, isHorizontal ? 0 : delta)
                },
                { amount: args.amount, isHorizontal, sign }
            )
        } else {
            await page.evaluate(
                ({ amount, isHorizontal, sign }) => {
                    const delta = (amount ?? (isHorizontal ? window.innerWidth : window.innerHeight)) * sign
                    window.scrollBy(isHorizontal ? delta : 0, isHorizontal ? 0 : delta)
                },
                { amount: args.amount, isHorizontal, sign }
            )
        }

        return `Scrolled ${args.direction}${args.amount !== undefined ? ` by ${args.amount}px` : ' by one viewport'}`
    }
}
