import { BrowserTypeTool } from '@tool/implementations/browser/BrowserTypeTool'
import { makeBrowserManager, makeLocatorMock, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserTypeTool', () => {
    it('has correct name', () => {
        expect(new BrowserTypeTool(makeBrowserManager()).name).toBe('browser_type')
    })

    it('types text into the element via locator.pressSequentially', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserTypeTool(makeBrowserManager(page))

        await tool.execute({ selector: '#name', text: 'hello' }, 'agent-1', 'session-1')

        expect(page.locator).toHaveBeenCalledWith('#name')
        expect(locator.pressSequentially).toHaveBeenCalledWith('hello', {})
    })

    it('passes delay and timeoutMs when provided', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserTypeTool(makeBrowserManager(page))

        await tool.execute({ selector: '#name', text: 'hi', delay: 20, timeoutMs: 3000 }, 'agent-1', 'session-1')

        expect(locator.pressSequentially).toHaveBeenCalledWith('hi', { delay: 20, timeout: 3000 })
    })

    it('clears the input first when clear is true', async () => {
        const page = makePageMock()
        const tool = new BrowserTypeTool(makeBrowserManager(page))

        await tool.execute({ selector: '#name', text: 'hi', clear: true }, 'agent-1', 'session-1')

        expect(page.fill).toHaveBeenCalledWith('#name', '', {})
    })

    it('does not clear the input when clear is false or omitted', async () => {
        const page = makePageMock()
        const tool = new BrowserTypeTool(makeBrowserManager(page))

        await tool.execute({ selector: '#name', text: 'hi' }, 'agent-1', 'session-1')

        expect(page.fill).not.toHaveBeenCalled()
    })

    it('passes timeoutMs to fill when clearing', async () => {
        const page = makePageMock()
        const tool = new BrowserTypeTool(makeBrowserManager(page))

        await tool.execute({ selector: '#name', text: 'hi', clear: true, timeoutMs: 2000 }, 'agent-1', 'session-1')

        expect(page.fill).toHaveBeenCalledWith('#name', '', { timeout: 2000 })
    })

    it('returns a confirmation message with the text and selector', async () => {
        const tool = new BrowserTypeTool(makeBrowserManager())
        const result = await tool.execute({ selector: '#name', text: 'hi' }, 'agent-1', 'session-1')
        expect(result).toBe('Typed "hi" into element "#name"')
    })
})
