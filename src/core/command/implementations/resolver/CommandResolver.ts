import { AgentDispatcherInterface } from '@agent/dispatcher'
import { SkillRegistryInterface } from '@skill'
import { SkillCommand } from '../command'
import { CommandRegistryInterface, CommandResolverInterface } from '../../interfaces'
import { COMMAND_ALIASES, CommandResolution, COMMAND_RESOLUTION } from '../../types'

export class CommandResolver implements CommandResolverInterface {
    constructor(
        private readonly commandRegistry: CommandRegistryInterface,
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly dispatcher: AgentDispatcherInterface
    ) {}

    resolve(content: string): CommandResolution {
        const trimmed = content.trim()

        for (const [symbol, name] of Object.entries(COMMAND_ALIASES)) {
            if (!trimmed.startsWith(symbol)) continue

            const argument = trimmed.slice(symbol.length).trim()
            const command = this.commandRegistry.get(name)

            if (command === null) {
                return { type: COMMAND_RESOLUTION.UNKNOWN_COMMAND, trigger: symbol }
            }

            return { type: COMMAND_RESOLUTION.MATCHED, command, argument, rawContent: trimmed }
        }

        if (!trimmed.startsWith('/')) {
            return { type: COMMAND_RESOLUTION.NOT_A_COMMAND }
        }

        const withoutSlash = trimmed.slice(1)
        const spaceIndex = withoutSlash.search(/\s/)
        const word = spaceIndex === -1 ? withoutSlash : withoutSlash.slice(0, spaceIndex)
        const argument = spaceIndex === -1 ? '' : withoutSlash.slice(spaceIndex + 1).trim()

        const command = this.commandRegistry.get(word)

        if (command !== null) {
            return { type: COMMAND_RESOLUTION.MATCHED, command, argument, rawContent: trimmed }
        }

        const skill = this.skillRegistry.get(word)

        if (skill !== null) {
            return {
                type: COMMAND_RESOLUTION.MATCHED,
                command: new SkillCommand(skill, this.dispatcher),
                argument,
                rawContent: trimmed
            }
        }

        return { type: COMMAND_RESOLUTION.UNKNOWN_COMMAND, trigger: `/${word}` }
    }
}
