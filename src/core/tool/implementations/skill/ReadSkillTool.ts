import { z } from 'zod'
import { Skill, SkillRegistryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { readSkillToolSchema } from './validators'

export class ReadSkillTool extends BaseSkillTool<typeof readSkillToolSchema> {
    readonly name = 'skill_read'
    readonly description =
        'Reads the full content of a locally installed skill for the purpose of editing it. Use this tool only when you intend to modify the skill afterwards. Do NOT use this to access skill instructions for execution — to use a skill, call the corresponding skill__ tool directly.'
    readonly schema = readSkillToolSchema

    constructor(private readonly skillRegistry: SkillRegistryInterface) {
        super()
    }

    protected async run(args: z.infer<typeof readSkillToolSchema>): Promise<Skill> {
        const skill = this.skillRegistry.get(args.name)

        if (skill === null) {
            throw new AgentToolError(
                `Skill "${args.name}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        return skill
    }
}
