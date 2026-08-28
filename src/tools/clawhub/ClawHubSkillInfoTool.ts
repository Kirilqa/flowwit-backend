import { z } from 'zod'
import { BaseClawHubTool } from './BaseClawHubTool'
import { ClawHubSkill } from './types'
import { clawHubSkillInfoToolSchema } from './validators'

export class ClawHubSkillInfoTool extends BaseClawHubTool<typeof clawHubSkillInfoToolSchema> {
    readonly name = 'clawhub_skill_info'
    readonly description =
        'Returns full details about a ClawHub skill by slug, including description, version, owner, metadata and moderation status. Check moderation status before installing.'
    readonly schema = clawHubSkillInfoToolSchema

    protected async run(args: z.infer<typeof clawHubSkillInfoToolSchema>): Promise<ClawHubSkill> {
        return this.client.getSkill(args.slug)
    }
}
