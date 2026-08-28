import { BrowserGetContentTool } from '@tool/implementations/browser/BrowserGetContentTool'
import { makeBrowserManager, makeLocatorMock, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserGetContentTool', () => {
    it('has correct name', () => {
        expect(new BrowserGetContentTool(makeBrowserManager()).name).toBe('browser_get_content')
    })

    it('defaults to text format for the whole page via page.evaluate', async () => {
        const page = makePageMock({ evaluate: jest.fn().mockResolvedValue('page text') })
        const tool = new BrowserGetContentTool(makeBrowserManager(page))

        const result = await tool.execute({}, 'agent-1', 'session-1')

        expect(page.evaluate).toHaveBeenCalled()
        expect(result).toBe('page text')
    })

    it('gets text content of a specific element via locator.innerText', async () => {
        const locator = makeLocatorMock({ innerText: jest.fn().mockResolvedValue('element text') })
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserGetContentTool(makeBrowserManager(page))

        const result = await tool.execute({ selector: '#main' }, 'agent-1', 'session-1')

        expect(page.locator).toHaveBeenCalledWith('#main')
        expect(result).toBe('element text')
    })

    it('gets HTML of the whole page via page.content', async () => {
        const page = makePageMock({ content: jest.fn().mockResolvedValue('<div>whole page</div>') })
        const tool = new BrowserGetContentTool(makeBrowserManager(page))

        const result = await tool.execute({ format: 'html' }, 'agent-1', 'session-1')

        expect(result).toBe('<div>whole page</div>')
    })

    it('gets HTML of a specific element via locator.innerHTML', async () => {
        const locator = makeLocatorMock({ innerHTML: jest.fn().mockResolvedValue('<span>x</span>') })
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserGetContentTool(makeBrowserManager(page))

        const result = await tool.execute({ selector: '#x', format: 'html' }, 'agent-1', 'session-1')

        expect(result).toBe('<span>x</span>')
    })

    it('the whole-page evaluate callback reads document.body.innerText', async () => {
        const page = makePageMock()
        const tool = new BrowserGetContentTool(makeBrowserManager(page))
        const original = (globalThis as { document?: unknown }).document
        ;(globalThis as unknown as { document: { body: { innerText: string } } }).document = {
            body: { innerText: 'stubbed text' }
        }
        try {
            await tool.execute({}, 'agent-1', 'session-1')
            const [callback] = page.evaluate.mock.calls[0] as [() => string]
            expect(callback()).toBe('stubbed text')
        } finally {
            ;(globalThis as { document?: unknown }).document = original
        }
    })

    it('converts HTML to markdown when format is markdown', async () => {
        const page = makePageMock({ content: jest.fn().mockResolvedValue('<h1>Title</h1>') })
        const tool = new BrowserGetContentTool(makeBrowserManager(page))

        const result = (await tool.execute({ format: 'markdown' }, 'agent-1', 'session-1')) as string

        expect(result).toContain('Title')
        expect(result).toContain('#')
    })
})
