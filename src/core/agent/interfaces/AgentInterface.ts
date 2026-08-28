import { AgentConfig, AgentEvent, AgentRunOptions } from '../types'
import { SessionInterface } from '@session'

export interface AgentInterface {
    readonly config: AgentConfig

    update(config: Partial<AgentConfig>): void

    run(input: string, session: SessionInterface, options?: AgentRunOptions): AsyncIterable<AgentEvent>
    stop(sessionId: string): Promise<void>
}
