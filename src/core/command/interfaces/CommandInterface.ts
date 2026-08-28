import { AgentEvent } from '@agent'
import { SessionInterface } from '@session'

export interface CommandInterface {
    readonly name: string
    readonly description?: string
    execute(argument: string, rawContent: string, agentId: string, session: SessionInterface): AsyncIterable<AgentEvent>
}
