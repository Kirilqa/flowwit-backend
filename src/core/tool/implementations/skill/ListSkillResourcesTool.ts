import { z } from 'zod'
import { SkillRegistryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { ResourceSummary } from './types'
import { listSkillResourcesToolSchema } from './validators'

export class ListSkillResourcesTool extends BaseSkillTool<typeof listSkillResourcesToolSchema> {
    readonly name = 'skill_resource_list'
    readonly description =
        'Returns a list of all resource files inside a skill directory, excluding SKILL.md. Paths are relative to the skill directory.'
    readonly schema = listSkillResourcesToolSchema

    constructor(private readonly skillRegistry: SkillRegistryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof listSkillResourcesToolSchema>): Promise<ResourceSummary> {
        const skill = this.skillRegistry.get(args.skillName)

        if (skill === null) {
            throw new AgentToolError(
                `Skill "${args.skillName}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        return {
            skillName: skill.name,
            directory: skill.directory,
            resources: skill.resources
        }
    }
}
