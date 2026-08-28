import { BrowserChannel } from './BrowserChannel'
import { ProxyConfig } from './ProxyConfig'

export type BrowserManagerOptions = {
    headless?: boolean
    cdpUrl?: string
    channel?: BrowserChannel
    proxy?: ProxyConfig
    proxyPool?: Array<ProxyConfig>
    viewport?: {
        width: number
        height: number
    }
    userAgent?: string
    defaultTimeoutMs?: number
    defaultNavigationTimeoutMs?: number
    launchArgs?: Array<string>
    stealth?: boolean
}
