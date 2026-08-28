import { BrowserScrollTool } from '@tool/implementations/browser/BrowserScrollTool'
import { makeBrowserManager, makeLocatorMock, makePageMock } from '../../../../../helpers/makeBrowser'

describe('BrowserScrollTool', () => {
    it('has correct name', () => {
        expect(new BrowserScrollTool(makeBrowserManager()).name).toBe('browser_scroll')
    })

    it('scrolls the whole page via page.evaluate when no selector is provided', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))

        await tool.execute({ direction: 'down' }, 'agent-1', 'session-1')

        expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
            amount: undefined,
            isHorizontal: false,
            sign: 1
        })
    })

    it('scrolls a specific element via locator.evaluate when selector is provided', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserScrollTool(makeBrowserManager(page))

        await tool.execute({ direction: 'up', selector: '#panel' }, 'agent-1', 'session-1')

        expect(page.locator).toHaveBeenCalledWith('#panel')
        expect(locator.evaluate).toHaveBeenCalledWith(expect.any(Function), {
            amount: undefined,
            isHorizontal: false,
            sign: -1
        })
        expect(page.evaluate).not.toHaveBeenCalled()
    })

    it('sets isHorizontal true and sign 1 for right', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))

        await tool.execute({ direction: 'right', amount: 200 }, 'agent-1', 'session-1')

        expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
            amount: 200,
            isHorizontal: true,
            sign: 1
        })
    })

    it('sets isHorizontal true and sign -1 for left', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))

        await tool.execute({ direction: 'left' }, 'agent-1', 'session-1')

        expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
            amount: undefined,
            isHorizontal: true,
            sign: -1
        })
    })

    it('returns a message including the amount when provided', async () => {
        const tool = new BrowserScrollTool(makeBrowserManager())
        const result = await tool.execute({ direction: 'down', amount: 300 }, 'agent-1', 'session-1')
        expect(result).toBe('Scrolled down by 300px')
    })

    it('returns a message noting one viewport when amount is not provided', async () => {
        const tool = new BrowserScrollTool(makeBrowserManager())
        const result = await tool.execute({ direction: 'down' }, 'agent-1', 'session-1')
        expect(result).toBe('Scrolled down by one viewport')
    })

    it('the page-level evaluate callback scrolls by the given amount using window.scrollBy', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))
        const scrollBySpy = jest.fn()
        const original = (globalThis as { window?: unknown }).window
        ;(
            globalThis as unknown as { window: { innerWidth: number; innerHeight: number; scrollBy: jest.Mock } }
        ).window = {
            innerWidth: 800,
            innerHeight: 600,
            scrollBy: scrollBySpy
        }
        try {
            await tool.execute({ direction: 'down', amount: 100 }, 'agent-1', 'session-1')
            const [callback, payload] = page.evaluate.mock.calls[0] as [
                (p: { amount?: number; isHorizontal: boolean; sign: number }) => void,
                { amount?: number; isHorizontal: boolean; sign: number }
            ]
            callback(payload)
            expect(scrollBySpy).toHaveBeenCalledWith(0, 100)
        } finally {
            ;(globalThis as { window?: unknown }).window = original
        }
    })

    it('the page-level evaluate callback falls back to window.innerWidth when amount is not provided', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))
        const scrollBySpy = jest.fn()
        const original = (globalThis as { window?: unknown }).window
        ;(
            globalThis as unknown as { window: { innerWidth: number; innerHeight: number; scrollBy: jest.Mock } }
        ).window = {
            innerWidth: 800,
            innerHeight: 600,
            scrollBy: scrollBySpy
        }
        try {
            await tool.execute({ direction: 'right' }, 'agent-1', 'session-1')
            const [callback, payload] = page.evaluate.mock.calls[0] as [
                (p: { amount?: number; isHorizontal: boolean; sign: number }) => void,
                { amount?: number; isHorizontal: boolean; sign: number }
            ]
            callback(payload)
            expect(scrollBySpy).toHaveBeenCalledWith(800, 0)
        } finally {
            ;(globalThis as { window?: unknown }).window = original
        }
    })

    it('the locator evaluate callback scrolls the element vertically using its clientHeight', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserScrollTool(makeBrowserManager(page))
        const el = { clientWidth: 300, clientHeight: 400, scrollBy: jest.fn() }

        await tool.execute({ direction: 'up', selector: '#panel' }, 'agent-1', 'session-1')

        const [callback, payload] = locator.evaluate.mock.calls[0] as [
            (element: typeof el, p: { amount?: number; isHorizontal: boolean; sign: number }) => void,
            { amount?: number; isHorizontal: boolean; sign: number }
        ]
        callback(el, payload)
        expect(el.scrollBy).toHaveBeenCalledWith(0, -400)
    })

    it('the locator evaluate callback scrolls the element horizontally using its clientWidth', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserScrollTool(makeBrowserManager(page))
        const el = { clientWidth: 300, clientHeight: 400, scrollBy: jest.fn() }

        await tool.execute({ direction: 'left', selector: '#panel' }, 'agent-1', 'session-1')

        const [callback, payload] = locator.evaluate.mock.calls[0] as [
            (element: typeof el, p: { amount?: number; isHorizontal: boolean; sign: number }) => void,
            { amount?: number; isHorizontal: boolean; sign: number }
        ]
        callback(el, payload)
        expect(el.scrollBy).toHaveBeenCalledWith(-300, 0)
    })

    it('the page-level evaluate callback falls back to window.innerHeight for vertical scrolling', async () => {
        const page = makePageMock()
        const tool = new BrowserScrollTool(makeBrowserManager(page))
        const scrollBySpy = jest.fn()
        const original = (globalThis as { window?: unknown }).window
        ;(
            globalThis as unknown as { window: { innerWidth: number; innerHeight: number; scrollBy: jest.Mock } }
        ).window = {
            innerWidth: 800,
            innerHeight: 600,
            scrollBy: scrollBySpy
        }
        try {
            await tool.execute({ direction: 'up' }, 'agent-1', 'session-1')
            const [callback, payload] = page.evaluate.mock.calls[0] as [
                (p: { amount?: number; isHorizontal: boolean; sign: number }) => void,
                { amount?: number; isHorizontal: boolean; sign: number }
            ]
            callback(payload)
            expect(scrollBySpy).toHaveBeenCalledWith(0, -600)
        } finally {
            ;(globalThis as { window?: unknown }).window = original
        }
    })
})
