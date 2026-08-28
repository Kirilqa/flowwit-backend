import { Page } from 'playwright'
import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'
import { BrowserManager } from '../BrowserManager'
import { BrowserPageOptions } from '../types'

export abstract class BaseBrowserTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    protected readonly manager: BrowserManager
    protected readonly pageOptions: BrowserPageOptions | undefined

    constructor(manager: BrowserManager, pageOptions?: BrowserPageOptions) {
        super()
        this.manager = manager

        if (pageOptions !== undefined) {
            this.pageOptions = pageOptions
        }
    }

    protected async getPage(sessionId: string): Promise<Page> {
        return this.manager.getPage(sessionId, this.pageOptions)
    }
}
