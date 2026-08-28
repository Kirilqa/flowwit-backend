import { z } from 'zod'
import { SkillRegistryInterface, SkillResourceRepositoryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { getErrorMessage } from '@core/utils'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { deleteSkillResourceToolSchema } from './validators'

export class DeleteSkillResourceTool extends BaseSkillTool<typeof deleteSkillResourceToolSchema> {
    readonly name = 'skill_resource_delete'
    readonly description =
        'Deletes a resource file inside a skill directory. Only regular resource files can be deleted — SKILL.md cannot be removed with this tool, use skill_delete instead.'
    readonly schema = deleteSkillResourceToolSchema

    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly skillResourceRepository: SkillResourceRepositoryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteSkillResourceToolSchema>): Promise<string> {
        if (!this.skillRegistry.has(args.skillName)) {
            throw new AgentToolError(
                `Skill "${args.skillName}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        try {
            await this.skillResourceRepository.deleteResource(args.skillName, args.relativePath)
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        return `Resource "${args.relativePath}" deleted successfully.`
    }
}
