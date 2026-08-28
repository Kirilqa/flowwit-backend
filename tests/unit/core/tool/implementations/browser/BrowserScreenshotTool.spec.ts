import fs from 'fs/promises'
import { BrowserScreenshotTool } from '@tool/implementations/browser/BrowserScreenshotTool'
import { makeBrowserManager, makeLocatorMock, makePageMock } from '../../../../../helpers/makeBrowser'

jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined)
}))

describe('BrowserScreenshotTool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('has correct name', () => {
        expect(new BrowserScreenshotTool(makeBrowserManager()).name).toBe('browser_screenshot')
    })

    it('screenshots the whole page by default as png', async () => {
        const page = makePageMock({ screenshot: jest.fn().mockResolvedValue(Buffer.from('img')) })
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as {
            format: string
            savedTo: string | null
            data: string
        }

        expect(page.screenshot).toHaveBeenCalledWith({ type: 'png' })
        expect(result.format).toBe('png')
        expect(result.savedTo).toBeNull()
        expect(result.data).toBe(Buffer.from('img').toString('base64'))
    })

    it('screenshots a specific element via locator.screenshot when selector is provided', async () => {
        const locator = makeLocatorMock({ screenshot: jest.fn().mockResolvedValue(Buffer.from('el-img')) })
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        await tool.execute({ selector: '#hero' }, 'agent-1', 'session-1')

        expect(page.locator).toHaveBeenCalledWith('#hero')
        expect(locator.screenshot).toHaveBeenCalledWith({ type: 'png' })
        expect(page.screenshot).not.toHaveBeenCalled()
    })

    it('passes quality, omitBackground and scale options for element screenshots', async () => {
        const locator = makeLocatorMock()
        const page = makePageMock({ locator: jest.fn().mockReturnValue(locator) })
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        await tool.execute(
            { selector: '#hero', format: 'jpeg', quality: 90, omitBackground: true, scale: 'device' },
            'agent-1',
            'session-1'
        )

        expect(locator.screenshot).toHaveBeenCalledWith({
            type: 'jpeg',
            quality: 90,
            omitBackground: true,
            scale: 'device'
        })
    })

    it('passes fullPage, omitBackground, scale and clip options for whole-page screenshots', async () => {
        const page = makePageMock()
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        await tool.execute(
            {
                fullPage: true,
                omitBackground: true,
                scale: 'device',
                clip: { x: 0, y: 0, width: 10, height: 10 }
            },
            'agent-1',
            'session-1'
        )

        expect(page.screenshot).toHaveBeenCalledWith({
            type: 'png',
            fullPage: true,
            omitBackground: true,
            scale: 'device',
            clip: { x: 0, y: 0, width: 10, height: 10 }
        })
    })

    it('includes quality only for jpeg format', async () => {
        const page = makePageMock()
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        await tool.execute({ format: 'jpeg', quality: 80 }, 'agent-1', 'session-1')

        expect(page.screenshot).toHaveBeenCalledWith({ type: 'jpeg', quality: 80 })
    })

    it('omits quality for png format even when provided', async () => {
        const page = makePageMock()
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        await tool.execute({ format: 'png', quality: 80 }, 'agent-1', 'session-1')

        expect(page.screenshot).toHaveBeenCalledWith({ type: 'png' })
    })

    it('falls back to defaultOptions.format when args.format is not provided', async () => {
        const page = makePageMock()
        const tool = new BrowserScreenshotTool(makeBrowserManager(page), undefined, { format: 'jpeg' })

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as { format: string }

        expect(result.format).toBe('jpeg')
        expect(page.screenshot).toHaveBeenCalledWith({ type: 'jpeg' })
    })

    it('writes to savePath when provided', async () => {
        const page = makePageMock({ screenshot: jest.fn().mockResolvedValue(Buffer.from('img')) })
        const tool = new BrowserScreenshotTool(makeBrowserManager(page))

        const result = (await tool.execute({ savePath: '/tmp/shot.png' }, 'agent-1', 'session-1')) as {
            savedTo: string | null
        }

        expect(fs.writeFile).toHaveBeenCalledWith('/tmp/shot.png', Buffer.from('img'))
        expect(result.savedTo).toBe('/tmp/shot.png')
    })

    it('does not write to disk when savePath is not provided', async () => {
        const tool = new BrowserScreenshotTool(makeBrowserManager())
        await tool.execute({}, 'agent-1', 'session-1')
        expect(fs.writeFile).not.toHaveBeenCalled()
    })
})
