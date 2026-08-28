import { SessionInterface } from '@session'

export type ChannelRequest = {
    agentId: string
    session: SessionInterface
    content: string
    outputSchema?: Record<string, unknown>
}
