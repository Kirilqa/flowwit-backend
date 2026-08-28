import { z } from 'zod'
import { SkillRepositoryInterface, SkillRegistryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { deleteSkillToolSchema } from './validators'

export class DeleteSkillTool extends BaseSkillTool<typeof deleteSkillToolSchema> {
    readonly name = 'skill_delete'
    readonly description =
        'Deletes a skill by name. Removes the SKILL.md file from disk and unloads it from the system registry. The skill directory and its resources are not deleted.'
    readonly schema = deleteSkillToolSchema

    constructor(
        private readonly skillRepository: SkillRepositoryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteSkillToolSchema>): Promise<string> {
        if (!this.skillRegistry.has(args.name)) {
            throw new AgentToolError(
                `Skill "${args.name}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        await this.skillRepository.delete(args.name)
        this.skillRegistry.unregister(args.name)

        return `Skill "${args.name}" deleted successfully.`
    }
}
