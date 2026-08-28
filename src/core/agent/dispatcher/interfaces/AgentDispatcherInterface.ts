import { AgentEvent, AgentRunOptions } from '@agent'
import { SessionInterface } from '@session'

export interface AgentDispatcherInterface {
    send(
        agentId: string,
        session: SessionInterface,
        content: string,
        options?: AgentRunOptions
    ): AsyncIterable<AgentEvent>
    stop(sessionId: string): Promise<void>
}
