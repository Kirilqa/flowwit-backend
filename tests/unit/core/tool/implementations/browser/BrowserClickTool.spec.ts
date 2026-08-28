import { BrowserClickTool } from '@tool/implementations/browser/BrowserClickTool'
import { makeBrowserManager, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserClickTool', () => {
    it('has correct name', () => {
        expect(new BrowserClickTool(makeBrowserManager()).name).toBe('browser_click')
    })

    it('clicks the element identified by selector', async () => {
        const page = makePageMock()
        const tool = new BrowserClickTool(makeBrowserManager(page))

        await tool.execute({ selector: '#submit' }, 'agent-1', 'session-1')

        expect(page.click).toHaveBeenCalledWith('#submit', {})
    })

    it('passes button, clickCount, delay and timeoutMs when provided', async () => {
        const page = makePageMock()
        const tool = new BrowserClickTool(makeBrowserManager(page))

        await tool.execute(
            { selector: '#submit', button: 'right', clickCount: 2, delay: 50, timeoutMs: 5000 },
            'agent-1',
            'session-1'
        )

        expect(page.click).toHaveBeenCalledWith('#submit', {
            button: 'right',
            clickCount: 2,
            delay: 50,
            timeout: 5000
        })
    })

    it('returns a confirmation message with the selector', async () => {
        const tool = new BrowserClickTool(makeBrowserManager())
        const result = await tool.execute({ selector: '#submit' }, 'agent-1', 'session-1')
        expect(result).toBe('Clicked on element "#submit"')
    })
})
