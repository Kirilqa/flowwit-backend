import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { browserWaitToolSchema } from './validators'

export class BrowserWaitTool extends BaseBrowserTool<typeof browserWaitToolSchema> {
    readonly name = 'browser_wait'
    readonly description = 'Waits for an element to reach a specific state, or waits for a specified duration'
    readonly schema = browserWaitToolSchema

    protected async run(
        args: z.infer<typeof browserWaitToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<string> {
        const page = await this.getPage(sessionId)

        if (args.selector) {
            await page.waitForSelector(args.selector, {
                ...(args.state !== undefined && { state: args.state }),
                ...(args.timeoutMs !== undefined && { timeout: args.timeoutMs })
            })

            return `Element "${args.selector}" reached state "${args.state ?? 'visible'}"`
        }

        const duration = args.duration ?? 1000
        await page.waitForTimeout(duration)

        return `Waited for ${duration}ms`
    }
}
