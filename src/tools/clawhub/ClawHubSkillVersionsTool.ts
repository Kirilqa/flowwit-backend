import { z } from 'zod'
import { BaseClawHubTool } from './BaseClawHubTool'
import { ClawHubSkillVersion } from './types'
import { clawHubSkillVersionsToolSchema } from './validators'

export class ClawHubSkillVersionsTool extends BaseClawHubTool<typeof clawHubSkillVersionsToolSchema> {
    readonly name = 'clawhub_skill_versions'
    readonly description =
        'Returns a list of published versions for a ClawHub skill. Use this to pick a specific version before installing.'
    readonly schema = clawHubSkillVersionsToolSchema

    protected async run(args: z.infer<typeof clawHubSkillVersionsToolSchema>): Promise<Array<ClawHubSkillVersion>> {
        return this.client.getSkillVersions(args.slug, args.limit)
    }
}
