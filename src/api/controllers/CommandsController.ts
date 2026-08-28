import { FastifyReply, FastifyRequest } from 'fastify'
import { SkillRegistryInterface } from '@skill'
import { CommandRegistryInterface } from '@command'
import { CommandSuggestion, COMMAND_SUGGESTION_TYPE } from '../types'

export class CommandsController {
    constructor(
        private readonly commandRegistry: CommandRegistryInterface,
        private readonly skillRegistry: SkillRegistryInterface
    ) {}

    async listCommands(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const commands: Array<CommandSuggestion> = this.commandRegistry.list().map(command => ({
            type: COMMAND_SUGGESTION_TYPE.COMMAND,
            name: command.name,
            ...(command.description !== undefined && { description: command.description })
        }))

        const skills: Array<CommandSuggestion> = this.skillRegistry.list().map(skill => ({
            type: COMMAND_SUGGESTION_TYPE.SKILL,
            name: skill.name,
            description: skill.description
        }))

        await reply.status(200).send([...commands, ...skills])
    }
}
