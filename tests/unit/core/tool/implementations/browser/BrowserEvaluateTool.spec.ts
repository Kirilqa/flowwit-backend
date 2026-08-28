import { BrowserEvaluateTool } from '@tool/implementations/browser/BrowserEvaluateTool'
import { makeBrowserManager, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserEvaluateTool', () => {
    it('has correct name', () => {
        expect(new BrowserEvaluateTool(makeBrowserManager()).name).toBe('browser_evaluate')
    })

    it('calls page.evaluate with the script and arg', async () => {
        const page = makePageMock()
        const tool = new BrowserEvaluateTool(makeBrowserManager(page))

        await tool.execute({ script: 'return 1 + 1', arg: { x: 1 } }, 'agent-1', 'session-1')

        expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), { script: 'return 1 + 1', arg: { x: 1 } })
    })

    it('returns the evaluated result', async () => {
        const page = makePageMock({ evaluate: jest.fn().mockResolvedValue(42) })
        const tool = new BrowserEvaluateTool(makeBrowserManager(page))

        const result = await tool.execute({ script: 'return 42' }, 'agent-1', 'session-1')

        expect(result).toBe(42)
    })

    it('returns null when the evaluated result is undefined', async () => {
        const page = makePageMock({ evaluate: jest.fn().mockResolvedValue(undefined) })
        const tool = new BrowserEvaluateTool(makeBrowserManager(page))

        const result = await tool.execute({ script: 'return undefined' }, 'agent-1', 'session-1')

        expect(result).toBeNull()
    })

    it('the evaluate callback builds and runs the script with the given arg', async () => {
        const page = makePageMock()
        const tool = new BrowserEvaluateTool(makeBrowserManager(page))

        await tool.execute({ script: 'return arg.x + 1', arg: { x: 1 } }, 'agent-1', 'session-1')

        const [callback, payload] = page.evaluate.mock.calls[0] as [
            (p: { script: string; arg: unknown }) => unknown,
            { script: string; arg: unknown }
        ]
        expect(callback(payload)).toBe(2)
    })
})
