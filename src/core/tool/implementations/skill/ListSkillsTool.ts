import { z } from 'zod'
import { SkillRegistryInterface } from '@skill'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { SkillSummary } from './types'
import { listSkillsToolSchema } from './validators'

export class ListSkillsTool extends BaseSkillTool<typeof listSkillsToolSchema> {
    readonly name = 'skill_list'
    readonly description =
        'Returns a list of all skills installed in the system — not the skills available to you for execution. To use a skill, call the corresponding skill__ tool directly. Use this tool only for skill management purposes such as creating, updating or registering skills.'
    readonly schema = listSkillsToolSchema

    constructor(private readonly skillRegistry: SkillRegistryInterface) {
        super()
    }

    protected async run(_args: z.infer<typeof listSkillsToolSchema>): Promise<Array<SkillSummary>> {
        const skills = Object.values(this.skillRegistry.list())

        return skills.map(skill => ({
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            resources: skill.resources
        }))
    }
}
