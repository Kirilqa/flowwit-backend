import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '@tool'
import { ClawHubClient } from './ClawHubClient'

export abstract class BaseClawHubTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    constructor(protected readonly client: ClawHubClient) {
        super()
    }
}
