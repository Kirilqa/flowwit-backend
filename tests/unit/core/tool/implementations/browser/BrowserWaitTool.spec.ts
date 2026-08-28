import { BrowserWaitTool } from '@tool/implementations/browser/BrowserWaitTool'
import { makeBrowserManager, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserWaitTool', () => {
    it('has correct name', () => {
        expect(new BrowserWaitTool(makeBrowserManager()).name).toBe('browser_wait')
    })

    it('waits for a selector when provided', async () => {
        const page = makePageMock()
        const tool = new BrowserWaitTool(makeBrowserManager(page))

        await tool.execute({ selector: '#el' }, 'agent-1', 'session-1')

        expect(page.waitForSelector).toHaveBeenCalledWith('#el', {})
        expect(page.waitForTimeout).not.toHaveBeenCalled()
    })

    it('passes state and timeoutMs to waitForSelector', async () => {
        const page = makePageMock()
        const tool = new BrowserWaitTool(makeBrowserManager(page))

        await tool.execute({ selector: '#el', state: 'hidden', timeoutMs: 5000 }, 'agent-1', 'session-1')

        expect(page.waitForSelector).toHaveBeenCalledWith('#el', { state: 'hidden', timeout: 5000 })
    })

    it('returns a message with the default "visible" state when state is omitted', async () => {
        const tool = new BrowserWaitTool(makeBrowserManager())
        const result = await tool.execute({ selector: '#el' }, 'agent-1', 'session-1')
        expect(result).toBe('Element "#el" reached state "visible"')
    })

    it('returns a message with the given state', async () => {
        const tool = new BrowserWaitTool(makeBrowserManager())
        const result = await tool.execute({ selector: '#el', state: 'attached' }, 'agent-1', 'session-1')
        expect(result).toBe('Element "#el" reached state "attached"')
    })

    it('waits for a duration via waitForTimeout when no selector is provided', async () => {
        const page = makePageMock()
        const tool = new BrowserWaitTool(makeBrowserManager(page))

        await tool.execute({ duration: 500 }, 'agent-1', 'session-1')

        expect(page.waitForTimeout).toHaveBeenCalledWith(500)
        expect(page.waitForSelector).not.toHaveBeenCalled()
    })

    it('defaults duration to 1000ms when neither selector nor duration is provided', async () => {
        const page = makePageMock()
        const tool = new BrowserWaitTool(makeBrowserManager(page))

        const result = await tool.execute({}, 'agent-1', 'session-1')

        expect(page.waitForTimeout).toHaveBeenCalledWith(1000)
        expect(result).toBe('Waited for 1000ms')
    })
})
