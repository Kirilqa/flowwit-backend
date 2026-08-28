import { z } from 'zod'
import { SkillRegistryInterface, SkillResourceRepositoryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { getErrorMessage } from '@core/utils'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { writeSkillResourceToolSchema } from './validators'

export class WriteSkillResourceTool extends BaseSkillTool<typeof writeSkillResourceToolSchema> {
    readonly name = 'skill_resource_write'
    readonly description =
        'Creates or overwrites a resource file inside a skill directory. Use this to add or update supporting files such as scripts, templates or reference documents that belong to a skill.'
    readonly schema = writeSkillResourceToolSchema

    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly skillResourceRepository: SkillResourceRepositoryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof writeSkillResourceToolSchema>): Promise<string> {
        if (!this.skillRegistry.has(args.skillName)) {
            throw new AgentToolError(
                `Skill "${args.skillName}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        try {
            await this.skillResourceRepository.writeResource(
                args.skillName,
                args.relativePath,
                Buffer.from(args.content, 'utf-8')
            )
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        return `Resource "${args.relativePath}" written successfully in skill "${args.skillName}".`
    }
}
