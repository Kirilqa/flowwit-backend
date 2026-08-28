import { BrowserManager } from '@tool/implementations/browser/BrowserManager'

type MockPage = { close: jest.Mock }
type MockContext = {
    newPage: jest.Mock
    close: jest.Mock
    setDefaultTimeout: jest.Mock
    setDefaultNavigationTimeout: jest.Mock
}
type MockBrowser = { newContext: jest.Mock; close: jest.Mock }

let mockPage: MockPage
let mockContext: MockContext
let mockBrowser: MockBrowser
let launchMock: jest.Mock<Promise<MockBrowser>>
let connectOverCDPMock: jest.Mock<Promise<MockBrowser>>

jest.mock('playwright', () => ({
    chromium: {
        launch: (...args: Array<unknown>) => launchMock(...args),
        connectOverCDP: (...args: Array<unknown>) => connectOverCDPMock(...args)
    },
    devices: {
        'iPhone 15': { viewport: { width: 393, height: 852 }, userAgent: 'iphone-ua' }
    }
}))

describe('BrowserManager', () => {
    beforeEach(() => {
        mockPage = { close: jest.fn().mockResolvedValue(undefined) }
        mockContext = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn().mockResolvedValue(undefined),
            setDefaultTimeout: jest.fn(),
            setDefaultNavigationTimeout: jest.fn()
        }
        mockBrowser = {
            newContext: jest.fn().mockResolvedValue(mockContext),
            close: jest.fn().mockResolvedValue(undefined)
        }
        launchMock = jest.fn().mockResolvedValue(mockBrowser)
        connectOverCDPMock = jest.fn().mockResolvedValue(mockBrowser)
    })

    describe('getPage()', () => {
        it('launches a browser and creates a page for a new session', async () => {
            const manager = new BrowserManager()
            const page = await manager.getPage('session-1')

            expect(launchMock).toHaveBeenCalledTimes(1)
            expect(mockBrowser.newContext).toHaveBeenCalledTimes(1)
            expect(mockContext.newPage).toHaveBeenCalledTimes(1)
            expect(page).toBe(mockPage)
        })

        it('reuses the existing page for the same sessionId', async () => {
            const manager = new BrowserManager()
            const first = await manager.getPage('session-1')
            const second = await manager.getPage('session-1')

            expect(first).toBe(second)
            expect(launchMock).toHaveBeenCalledTimes(1)
            expect(mockContext.newPage).toHaveBeenCalledTimes(1)
        })

        it('reuses the same browser instance across different sessions', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            await manager.getPage('session-2')

            expect(launchMock).toHaveBeenCalledTimes(1)
            expect(mockBrowser.newContext).toHaveBeenCalledTimes(2)
        })

        it('launches headless by default', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ headless: true }))
        })

        it('respects headless: false option', async () => {
            const manager = new BrowserManager({ headless: false })
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ headless: false }))
        })

        it('passes channel option when provided', async () => {
            const manager = new BrowserManager({ channel: 'msedge' })
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ channel: 'msedge' }))
        })

        it('forces chrome channel when stealth is enabled', async () => {
            const manager = new BrowserManager({ stealth: true })
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ channel: 'chrome' }))
        })

        it('passes launchArgs when provided', async () => {
            const manager = new BrowserManager({ launchArgs: ['--no-sandbox'] })
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ args: ['--no-sandbox'] }))
        })

        it('passes proxy option to launch when provided', async () => {
            const manager = new BrowserManager({ proxy: { server: 'http://proxy:8080' } })
            await manager.getPage('session-1')
            expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({ proxy: { server: 'http://proxy:8080' } }))
        })

        it('connects over CDP when cdpUrl is provided, skipping launch', async () => {
            const manager = new BrowserManager({ cdpUrl: 'http://localhost:9222' })
            await manager.getPage('session-1')

            expect(connectOverCDPMock).toHaveBeenCalledWith('http://localhost:9222')
            expect(launchMock).not.toHaveBeenCalled()
        })

        it('applies default viewport when none is configured', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({ viewport: { width: 1280, height: 720 } })
            )
        })

        it('uses manager-level viewport when configured', async () => {
            const manager = new BrowserManager({ viewport: { width: 800, height: 600 } })
            await manager.getPage('session-1')
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({ viewport: { width: 800, height: 600 } })
            )
        })

        it('prefers per-page viewport over manager-level viewport', async () => {
            const manager = new BrowserManager({ viewport: { width: 800, height: 600 } })
            await manager.getPage('session-1', { viewport: { width: 100, height: 100 } })
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({ viewport: { width: 100, height: 100 } })
            )
        })

        it('applies device descriptor viewport and userAgent when device is specified', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1', { device: 'iPhone 15' })
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({ viewport: { width: 393, height: 852 }, userAgent: 'iphone-ua' })
            )
        })

        it('prefers per-page userAgent over manager-level and device userAgent', async () => {
            const manager = new BrowserManager({ userAgent: 'manager-ua' })
            await manager.getPage('session-1', { userAgent: 'page-ua', device: 'iPhone 15' })
            expect(mockBrowser.newContext).toHaveBeenCalledWith(expect.objectContaining({ userAgent: 'page-ua' }))
        })

        it('uses manager-level userAgent when no per-page userAgent is given', async () => {
            const manager = new BrowserManager({ userAgent: 'manager-ua' })
            await manager.getPage('session-1')
            expect(mockBrowser.newContext).toHaveBeenCalledWith(expect.objectContaining({ userAgent: 'manager-ua' }))
        })

        it('omits userAgent entirely when none is configured anywhere', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            const [contextOptions] = mockBrowser.newContext.mock.calls[0] as [Record<string, unknown>]
            expect(contextOptions).not.toHaveProperty('userAgent')
        })

        it('passes per-page proxy when provided, overriding proxyPool', async () => {
            const manager = new BrowserManager({ proxyPool: [{ server: 'http://pool:8080' }] })
            await manager.getPage('session-1', { proxy: { server: 'http://direct:8080' } })
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({ proxy: { server: 'http://direct:8080' } })
            )
        })

        it('cycles through the proxy pool round-robin across sessions', async () => {
            const manager = new BrowserManager({
                proxyPool: [{ server: 'http://p1:8080' }, { server: 'http://p2:8080' }]
            })
            await manager.getPage('session-1')
            await manager.getPage('session-2')
            await manager.getPage('session-3')

            const calls = mockBrowser.newContext.mock.calls as Array<[Record<string, unknown>]>
            expect(calls[0]?.[0]?.['proxy']).toEqual({ server: 'http://p1:8080' })
            expect(calls[1]?.[0]?.['proxy']).toEqual({ server: 'http://p2:8080' })
            expect(calls[2]?.[0]?.['proxy']).toEqual({ server: 'http://p1:8080' })
        })

        it('omits proxy when neither per-page proxy nor proxyPool is configured', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            const [contextOptions] = mockBrowser.newContext.mock.calls[0] as [Record<string, unknown>]
            expect(contextOptions).not.toHaveProperty('proxy')
        })

        it('passes extraHTTPHeaders, geolocation, locale and timezoneId page options', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1', {
                extraHTTPHeaders: { 'x-test': '1' },
                geolocation: { latitude: 1, longitude: 2 },
                locale: 'en-US',
                timezoneId: 'UTC'
            })
            expect(mockBrowser.newContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    extraHTTPHeaders: { 'x-test': '1' },
                    geolocation: { latitude: 1, longitude: 2 },
                    locale: 'en-US',
                    timezoneId: 'UTC'
                })
            )
        })

        it('sets default timeout on the context when configured', async () => {
            const manager = new BrowserManager({ defaultTimeoutMs: 5000 })
            await manager.getPage('session-1')
            expect(mockContext.setDefaultTimeout).toHaveBeenCalledWith(5000)
        })

        it('does not set default timeout when not configured', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            expect(mockContext.setDefaultTimeout).not.toHaveBeenCalled()
        })

        it('sets default navigation timeout on the context when configured', async () => {
            const manager = new BrowserManager({ defaultNavigationTimeoutMs: 8000 })
            await manager.getPage('session-1')
            expect(mockContext.setDefaultNavigationTimeout).toHaveBeenCalledWith(8000)
        })

        it('does not set default navigation timeout when not configured', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            expect(mockContext.setDefaultNavigationTimeout).not.toHaveBeenCalled()
        })
    })

    describe('closePage()', () => {
        it('closes the page and context for the session', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')

            await manager.closePage('session-1')

            expect(mockPage.close).toHaveBeenCalledTimes(1)
            expect(mockContext.close).toHaveBeenCalledTimes(1)
        })

        it('is a no-op when the session has no page', async () => {
            const manager = new BrowserManager()
            await expect(manager.closePage('missing')).resolves.toBeUndefined()
            expect(mockPage.close).not.toHaveBeenCalled()
        })

        it('allows getPage to create a fresh page after closePage', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            await manager.closePage('session-1')

            await manager.getPage('session-1')

            expect(mockContext.newPage).toHaveBeenCalledTimes(2)
        })
    })

    describe('closeAll()', () => {
        it('closes all open pages and the browser', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            await manager.getPage('session-2')

            await manager.closeAll()

            expect(mockPage.close).toHaveBeenCalledTimes(2)
            expect(mockBrowser.close).toHaveBeenCalledTimes(1)
        })

        it('is a no-op when no browser was ever launched', async () => {
            const manager = new BrowserManager()
            await expect(manager.closeAll()).resolves.toBeUndefined()
            expect(mockBrowser.close).not.toHaveBeenCalled()
        })

        it('resets the proxy pool index so the next session starts from the first proxy', async () => {
            const manager = new BrowserManager({
                proxyPool: [{ server: 'http://p1:8080' }, { server: 'http://p2:8080' }]
            })
            await manager.getPage('session-1')
            await manager.closeAll()

            await manager.getPage('session-2')

            const calls = mockBrowser.newContext.mock.calls as Array<[Record<string, unknown>]>
            expect(calls[1]?.[0]?.['proxy']).toEqual({ server: 'http://p1:8080' })
        })

        it('allows launching a new browser after closeAll', async () => {
            const manager = new BrowserManager()
            await manager.getPage('session-1')
            await manager.closeAll()

            await manager.getPage('session-2')

            expect(launchMock).toHaveBeenCalledTimes(2)
        })
    })
})
