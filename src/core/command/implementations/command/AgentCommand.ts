import { AgentEvent, AgentRegistryInterface } from '@agent'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { SessionInterface } from '@session'
import { CommandInterface } from '../../interfaces'
import { buildErrorEvent, splitCommandArgument } from '../../utils'

export class AgentCommand implements CommandInterface {
    readonly name = 'agent'
    readonly description =
        'Delegate this single message to a specific agent for this turn only, without switching the agent assigned to the session. Usage: <agentId> <message>.'

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly dispatcher: AgentDispatcherInterface
    ) {}

    async *execute(
        argument: string,
        rawContent: string,
        agentId: string,
        session: SessionInterface
    ): AsyncIterable<AgentEvent> {
        const { id: targetAgentId, rest } = splitCommandArgument(argument)

        if (targetAgentId === '' || rest === '') {
            yield buildErrorEvent(agentId, session.id, 'Usage: /agent <agentId> <message>')
            return
        }

        const targetAgent = this.agentRegistry.get(targetAgentId)

        if (targetAgent === null) {
            yield buildErrorEvent(agentId, session.id, `Agent "${targetAgentId}" not found`)
            return
        }

        yield* this.dispatcher.send(targetAgentId, session, rawContent)
    }
}
