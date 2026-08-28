import { z } from 'zod'
import { BaseBrowserTool } from './bases/BaseBrowserTool'
import { browserEvaluateToolSchema } from './validators'

export class BrowserEvaluateTool extends BaseBrowserTool<typeof browserEvaluateToolSchema> {
    readonly name = 'browser_evaluate'
    readonly description =
        'Executes JavaScript code in the browser context and returns the result. Useful for interacting with the page in ways that are not covered by other tools'
    readonly schema = browserEvaluateToolSchema

    protected async run(
        args: z.infer<typeof browserEvaluateToolSchema>,
        _agentId: string,
        sessionId: string
    ): Promise<unknown> {
        const page = await this.getPage(sessionId)

        const result = await page.evaluate(
            ({ script, arg }) => {
                // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs inside the sandboxed Playwright page context, not the Node process; this is the standard Playwright pattern for dynamic in-page evaluation
                const fn = new Function('arg', script)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- return type of an arbitrary user script is unknowable by construction
                return fn(arg) as unknown
            },
            { script: args.script, arg: args.arg }
        )

        return result ?? null
    }
}
