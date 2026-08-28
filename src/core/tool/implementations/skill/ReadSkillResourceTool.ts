import { z } from 'zod'
import { SkillRegistryInterface, SkillResourceRepositoryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { getErrorMessage } from '@core/utils'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { readSkillResourceToolSchema } from './validators'

export class ReadSkillResourceTool extends BaseSkillTool<typeof readSkillResourceToolSchema> {
    readonly name = 'skill_resource_read'
    readonly description =
        'Reads the content of a resource file inside a skill directory. Use this to inspect supporting files such as scripts, templates or reference documents that belong to a skill.'
    readonly schema = readSkillResourceToolSchema

    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly skillResourceRepository: SkillResourceRepositoryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof readSkillResourceToolSchema>): Promise<string> {
        if (!this.skillRegistry.has(args.skillName)) {
            throw new AgentToolError(
                `Skill "${args.skillName}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        let content: Buffer

        try {
            content = await this.skillResourceRepository.readResource(args.skillName, args.relativePath)
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        if (content.includes(0)) {
            throw new AgentToolError(
                `Resource "${args.relativePath}" appears to be a binary file and cannot be read as text. ` +
                    'Binary resources (images, fonts, templates) are meant to be used by bundled scripts via ' +
                    'skill_resource_run, not read directly.'
            )
        }

        return content.toString('utf-8')
    }
}
