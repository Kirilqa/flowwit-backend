import { AgentEvent } from '@agent'

export interface ChannelResponseInterface {
    stream(events: AsyncIterable<AgentEvent>): Promise<void>
    error(message: string): Promise<void>
}
