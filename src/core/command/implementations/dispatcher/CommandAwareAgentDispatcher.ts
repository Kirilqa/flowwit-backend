import { AgentEvent, AgentRunOptions } from '@agent'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { SessionInterface } from '@session'
import { CommandResolverInterface } from '../../interfaces'
import { COMMAND_RESOLUTION } from '../../types'
import { buildErrorEvent } from '../../utils'

export class CommandAwareAgentDispatcher implements AgentDispatcherInterface {
    constructor(
        private readonly dispatcher: AgentDispatcherInterface,
        private readonly resolver: CommandResolverInterface
    ) {}

    async *send(
        agentId: string,
        session: SessionInterface,
        content: string,
        options?: AgentRunOptions
    ): AsyncIterable<AgentEvent> {
        const resolution = this.resolver.resolve(content)

        if (resolution.type === COMMAND_RESOLUTION.NOT_A_COMMAND) {
            yield* this.dispatcher.send(agentId, session, content, options)
            return
        }

        if (resolution.type === COMMAND_RESOLUTION.UNKNOWN_COMMAND) {
            yield buildErrorEvent(agentId, session.id, `Unknown command "${resolution.trigger}"`)
            return
        }

        yield* resolution.command.execute(resolution.argument, resolution.rawContent, agentId, session)
    }

    async stop(sessionId: string): Promise<void> {
        return this.dispatcher.stop(sessionId)
    }
}
