export const BROWSER_CHANNEL = {
    CHROME: 'chrome',
    CHROME_BETA: 'chrome-beta',
    CHROME_DEV: 'chrome-dev',
    CHROME_CANARY: 'chrome-canary',
    MSEDGE: 'msedge',
    MSEDGE_BETA: 'msedge-beta',
    MSEDGE_DEV: 'msedge-dev',
    MSEDGE_CANARY: 'msedge-canary'
} as const

export type BrowserChannel = (typeof BROWSER_CHANNEL)[keyof typeof BROWSER_CHANNEL]
