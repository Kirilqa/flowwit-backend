import { Browser, BrowserContext, chromium, devices, Page } from 'playwright'
import { BrowserManagerOptions, BrowserPageOptions } from './types'
import { ProxyConfig } from './types/ProxyConfig'

export class BrowserManager {
    private readonly options: BrowserManagerOptions
    private browser: Browser | null = null
    private readonly contexts = new Map<string, BrowserContext>()
    private readonly pages = new Map<string, Page>()
    private proxyPoolIndex = 0

    constructor(options: BrowserManagerOptions = {}) {
        this.options = options
    }

    async getPage(sessionId: string, pageOptions?: BrowserPageOptions): Promise<Page> {
        const existingPage = this.pages.get(sessionId)
        if (existingPage) return existingPage

        const browser = await this.getBrowser()
        const proxy = this.resolveProxy(pageOptions)
        const context = await this.createContext(browser, proxy, pageOptions)

        this.contexts.set(sessionId, context)

        const page = await context.newPage()

        this.pages.set(sessionId, page)

        return page
    }

    async closePage(sessionId: string): Promise<void> {
        const page = this.pages.get(sessionId)

        if (page) {
            await page.close()
            this.pages.delete(sessionId)
        }

        const context = this.contexts.get(sessionId)

        if (context) {
            await context.close()
            this.contexts.delete(sessionId)
        }
    }

    async closeAll(): Promise<void> {
        for (const sessionId of this.pages.keys()) {
            await this.closePage(sessionId)
        }

        if (this.browser) {
            await this.browser.close()
            this.browser = null
        }

        this.proxyPoolIndex = 0
    }

    private async getBrowser(): Promise<Browser> {
        if (this.browser) {
            return this.browser
        }

        if (this.options.cdpUrl) {
            this.browser = await chromium.connectOverCDP(this.options.cdpUrl)
            return this.browser
        }

        this.browser = await chromium.launch({
            headless: this.options.headless ?? true,
            ...(this.options.channel !== undefined && { channel: this.options.channel }),
            ...(this.options.proxy !== undefined && { proxy: this.options.proxy }),
            ...(this.options.launchArgs !== undefined && { args: this.options.launchArgs }),
            ...(this.options.stealth && { channel: 'chrome' })
        })

        return this.browser
    }

    private async createContext(
        browser: Browser,
        proxy: ProxyConfig | undefined,
        pageOptions?: BrowserPageOptions
    ): Promise<BrowserContext> {
        const deviceDescriptor = pageOptions?.device ? devices[pageOptions.device] : undefined

        const resolvedUserAgent = pageOptions?.userAgent ?? this.options.userAgent ?? deviceDescriptor?.userAgent
        const resolvedViewport = pageOptions?.viewport ??
            this.options.viewport ??
            deviceDescriptor?.viewport ?? { width: 1280, height: 720 }

        const context = await browser.newContext({
            ...deviceDescriptor,
            viewport: resolvedViewport,
            ...(proxy !== undefined && { proxy: proxy }),
            ...(resolvedUserAgent !== undefined && { userAgent: resolvedUserAgent }),
            ...(pageOptions?.extraHTTPHeaders !== undefined && { extraHTTPHeaders: pageOptions.extraHTTPHeaders }),
            ...(pageOptions?.geolocation !== undefined && { geolocation: pageOptions.geolocation }),
            ...(pageOptions?.locale !== undefined && { locale: pageOptions.locale }),
            ...(pageOptions?.timezoneId !== undefined && { timezoneId: pageOptions.timezoneId })
        })

        if (this.options.defaultTimeoutMs !== undefined) {
            context.setDefaultTimeout(this.options.defaultTimeoutMs)
        }

        if (this.options.defaultNavigationTimeoutMs !== undefined) {
            context.setDefaultNavigationTimeout(this.options.defaultNavigationTimeoutMs)
        }

        return context
    }

    private resolveProxy(pageOptions?: BrowserPageOptions): ProxyConfig | undefined {
        if (pageOptions?.proxy) {
            return pageOptions.proxy
        }

        if (this.options.proxyPool && this.options.proxyPool.length > 0) {
            const proxy = this.options.proxyPool[this.proxyPoolIndex]
            this.proxyPoolIndex = (this.proxyPoolIndex + 1) % this.options.proxyPool.length
            return proxy
        }

        return undefined
    }
}
