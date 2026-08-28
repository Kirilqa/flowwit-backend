import { AgentEvent, AgentInterface, AgentRegistryInterface, AgentRunOptions } from '@agent'
import { SessionInterface } from '@session'
import { AgentDispatcherInterface } from '../interfaces'

export class AgentDispatcher implements AgentDispatcherInterface {
    private readonly activeAgentSessions = new Map<string, AgentInterface>()

    constructor(private readonly agentRegistry: AgentRegistryInterface) {}

    async *send(
        agentId: string,
        session: SessionInterface,
        content: string,
        options?: AgentRunOptions
    ): AsyncIterable<AgentEvent> {
        const agent = this.agentRegistry.get(agentId)

        if (!agent) {
            throw new Error(`Agent "${agentId}" not found`)
        }

        this.activeAgentSessions.set(session.id, agent)

        try {
            for await (const event of agent.run(content, session, options)) {
                yield event
            }
        } finally {
            this.activeAgentSessions.delete(session.id)
        }
    }

    async stop(sessionId: string): Promise<void> {
        const agent = this.activeAgentSessions.get(sessionId)
        if (!agent) return

        await agent.stop(sessionId)
    }
}
