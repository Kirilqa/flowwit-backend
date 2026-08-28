import { z } from 'zod'
import { BaseTool } from '../bases/BaseTool'
import { SkillRegistryInterface } from '@skill'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { SkillSummary } from './types'
import { registerSkillToolSchema } from './validators'

export class RegisterSkillTool extends BaseTool<typeof registerSkillToolSchema> {
    readonly name = 'skill_register'
    readonly description =
        'Registers a skill for yourself, making it available for execution. The skill must already be present in the system — use clawhub_install or skill_create first if needed, then ensure it is loaded into the registry.'
    readonly schema = registerSkillToolSchema

    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof registerSkillToolSchema>, agentId: string): Promise<SkillSummary> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const skill = this.skillRegistry.get(args.skillName)

        if (skill === null) {
            throw new AgentToolError(
                `Skill "${args.skillName}" is not available in the system registry. Install it first using clawhub_install or create it using skill_create.`
            )
        }

        const alreadyRegistered = agent.config.skills?.some(s => s.name === args.skillName) ?? false

        if (alreadyRegistered) {
            throw new AgentToolError(`Skill "${args.skillName}" is already registered.`)
        }

        const updatedSkills = [...(agent.config.skills ?? []), skill]

        agent.update({ skills: updatedSkills })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { skills: updatedSkills.map(s => s.name) })
        }

        return {
            name: skill.name,
            description: skill.description,
            directory: skill.directory,
            resources: skill.resources
        }
    }
}
