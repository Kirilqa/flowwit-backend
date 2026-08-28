import { Page, Response } from 'playwright'
import { BrowserManager } from '@tool/implementations/browser/BrowserManager'

export type LocatorMock = {
    innerText: jest.Mock
    innerHTML: jest.Mock
    pressSequentially: jest.Mock
    evaluate: jest.Mock
    screenshot: jest.Mock
}

export function makeLocatorMock(overrides: Partial<LocatorMock> = {}): LocatorMock {
    return {
        innerText: jest.fn().mockResolvedValue('inner text'),
        innerHTML: jest.fn().mockResolvedValue('<span>inner</span>'),
        pressSequentially: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue(undefined),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('locator-screenshot')),
        ...overrides
    }
}

export type PageMock = {
    click: jest.Mock
    fill: jest.Mock
    locator: jest.Mock
    goto: jest.Mock
    url: jest.Mock
    content: jest.Mock
    evaluate: jest.Mock
    screenshot: jest.Mock
    waitForSelector: jest.Mock
    waitForTimeout: jest.Mock
}

export function makeResponseMock(status = 200, statusText = 'OK'): Response {
    return {
        status: jest.fn().mockReturnValue(status),
        statusText: jest.fn().mockReturnValue(statusText)
    } as unknown as Response
}

export function makePageMock(overrides: Partial<PageMock> = {}): PageMock {
    return {
        click: jest.fn().mockResolvedValue(undefined),
        fill: jest.fn().mockResolvedValue(undefined),
        locator: jest.fn().mockReturnValue(makeLocatorMock()),
        goto: jest.fn().mockResolvedValue(makeResponseMock()),
        url: jest.fn().mockReturnValue('https://example.com/'),
        content: jest.fn().mockResolvedValue('<html><body>page</body></html>'),
        evaluate: jest.fn().mockResolvedValue('evaluated'),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('page-screenshot')),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        ...overrides
    }
}

export function makeBrowserManager(page: PageMock = makePageMock()): BrowserManager {
    const manager = new BrowserManager()
    jest.spyOn(manager, 'getPage').mockResolvedValue(page as unknown as Page)
    return manager
}
