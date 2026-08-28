import { z } from 'zod'
import { BaseClawHubTool } from './BaseClawHubTool'
import { ClawHubSearchResult } from './types'
import { clawHubSearchToolSchema } from './validators'

export class ClawHubSearchTool extends BaseClawHubTool<typeof clawHubSearchToolSchema> {
    readonly name = 'clawhub_search'
    readonly description =
        'Searches for skills on ClawHub by query. Returns a list of matching skills with their slug, description, version and owner. Use the slug to get more details or install a skill.'
    readonly schema = clawHubSearchToolSchema

    protected async run(args: z.infer<typeof clawHubSearchToolSchema>): Promise<Array<ClawHubSearchResult>> {
        return await this.client.search(args.query, args.limit)
    }
}
