import { z } from 'zod'
import { SkillRepositoryInterface, SkillRegistryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { SkillSummary } from './types'
import { createSkillToolSchema } from './validators'

export class CreateSkillTool extends BaseSkillTool<typeof createSkillToolSchema> {
    readonly name = 'skill_create'
    readonly description =
        'Creates a new skill with the given name, description and instructions. The skill will be saved to disk and registered in the system. Use skill_register to make it available for yourself.'
    readonly schema = createSkillToolSchema

    constructor(
        private readonly skillRepository: SkillRepositoryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof createSkillToolSchema>): Promise<SkillSummary> {
        if (this.skillRegistry.has(args.name)) {
            throw new AgentToolError(`Skill "${args.name}" already exists. Use skill_update to modify it.`)
        }

        const skill = await this.skillRepository.create({
            name: args.name,
            description: args.description,
            content: args.content,
            directory: '',
            resources: [],
            ...(args.license !== undefined && { license: args.license }),
            ...(args.compatibility !== undefined && { compatibility: args.compatibility }),
            ...(args.allowedTools !== undefined && { allowedTools: args.allowedTools }),
            ...(args.metadata !== undefined && { metadata: args.metadata })
        })

        this.skillRegistry.register(args.name, skill)

        return {
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            resources: skill.resources
        }
    }
}
