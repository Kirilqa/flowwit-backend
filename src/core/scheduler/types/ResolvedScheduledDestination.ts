import { ChannelInterface } from '@channel'
import { SessionInterface } from '@session'

export type ResolvedScheduledDestination = {
    channel: ChannelInterface
    session: SessionInterface
    options: Record<string, unknown>
}
