import { z } from 'zod'
import { Skill, SkillRepositoryInterface, SkillRegistryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { SkillSummary } from './types'
import { updateSkillToolSchema } from './validators'

export class UpdateSkillTool extends BaseSkillTool<typeof updateSkillToolSchema> {
    readonly name = 'skill_update'
    readonly description = 'Updates an existing skill. Only provided fields will be changed, the rest remain as is.'
    readonly schema = updateSkillToolSchema

    constructor(
        private readonly skillRepository: SkillRepositoryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof updateSkillToolSchema>): Promise<SkillSummary> {
        if (!this.skillRegistry.has(args.name)) {
            throw new AgentToolError(
                `Skill "${args.name}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        const patch: Partial<Skill> = {
            ...(args.description !== undefined && { description: args.description }),
            ...(args.content !== undefined && { content: args.content }),
            ...(args.license !== undefined && { license: args.license }),
            ...(args.compatibility !== undefined && { compatibility: args.compatibility }),
            ...(args.allowedTools !== undefined && { allowedTools: args.allowedTools }),
            ...(args.metadata !== undefined && { metadata: args.metadata })
        }

        const skill = await this.skillRepository.update(args.name, patch)

        this.skillRegistry.register(args.name, skill)

        return {
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            resources: skill.resources
        }
    }
}
