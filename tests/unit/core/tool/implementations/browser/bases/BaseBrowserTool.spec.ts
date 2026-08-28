import { z } from 'zod'
import { BaseBrowserTool } from '@tool/implementations/browser/bases/BaseBrowserTool'
import { BrowserPageOptions } from '@tool/implementations/browser/types'
import { makeBrowserManager, makePageMock } from '../../../../../../helpers/makeBrowser'

const schema = z.object({})

class TestBrowserTool extends BaseBrowserTool<typeof schema> {
    readonly name = 'test_browser_tool'
    readonly description = 'test'
    readonly schema = schema

    async getPagePublic(sessionId: string) {
        return this.getPage(sessionId)
    }

    get pageOptionsPublic(): BrowserPageOptions | undefined {
        return this.pageOptions
    }

    protected async run(): Promise<unknown> {
        return null
    }
}

describe('BaseBrowserTool', () => {
    it('leaves pageOptions undefined when not provided', () => {
        const tool = new TestBrowserTool(makeBrowserManager())
        expect(tool.pageOptionsPublic).toBeUndefined()
    })

    it('sets pageOptions from constructor', () => {
        const pageOptions: BrowserPageOptions = { locale: 'en-US' }
        const tool = new TestBrowserTool(makeBrowserManager(), pageOptions)
        expect(tool.pageOptionsPublic).toBe(pageOptions)
    })

    it('delegates getPage to manager.getPage with sessionId and pageOptions', async () => {
        const page = makePageMock()
        const manager = makeBrowserManager(page)
        const pageOptions: BrowserPageOptions = { locale: 'en-US' }
        const tool = new TestBrowserTool(manager, pageOptions)

        const result = await tool.getPagePublic('session-1')

        expect(manager.getPage).toHaveBeenCalledWith('session-1', pageOptions)
        expect(result).toBe(page)
    })
})
