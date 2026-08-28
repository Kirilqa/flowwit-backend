import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { unregisterSkillToolSchema } from './validators'

export class UnregisterSkillTool extends BaseSkillTool<typeof unregisterSkillToolSchema> {
    readonly name = 'skill_unregister'
    readonly description =
        'Unregisters a skill from yourself, making it unavailable for execution. The skill remains installed on disk and can be re-registered later.'
    readonly schema = unregisterSkillToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof unregisterSkillToolSchema>, agentId: string): Promise<string> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const isRegistered = agent.config.skills?.some(s => s.name === args.skillName) ?? false

        if (!isRegistered) {
            throw new AgentToolError(`Skill "${args.skillName}" is not registered for this agent.`)
        }

        const updatedSkills = (agent.config.skills ?? []).filter(s => s.name !== args.skillName)

        agent.update({ skills: updatedSkills })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { skills: updatedSkills.map(s => s.name) })
        }

        return `Skill "${args.skillName}" unregistered successfully.`
    }
}
