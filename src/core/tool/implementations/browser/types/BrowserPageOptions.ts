import { ProxyConfig } from './ProxyConfig'

export type BrowserPageOptions = {
    proxy?: ProxyConfig
    viewport?: {
        width: number
        height: number
    }
    userAgent?: string
    extraHTTPHeaders?: Record<string, string>
    device?: string
    geolocation?: {
        latitude: number
        longitude: number
    }
    locale?: string
    timezoneId?: string
}
