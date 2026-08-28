import { SessionInterface } from '@session'
import { ChannelSettings } from '../types/ChannelSettings'
import { ChannelSettingSchema } from '../types/ChannelSettingSchema'
import { ChannelSendOptionSchema } from '../types/ChannelSendOptionSchema'
import { ScheduledDeliveryOutcome } from '../types/ScheduledDeliveryOutcome'
import { ChannelMessageHandler } from '../types/ChannelMessageHandler'
import { ChannelStopHandler } from '../types/ChannelStopHandler'

export interface ChannelInterface<
    TSettings extends ChannelSettings = ChannelSettings,
    TSendOptions extends Record<string, unknown> = Record<string, unknown>
> {
    readonly id: string
    readonly settingsSchema: Array<ChannelSettingSchema<TSettings>>
    start(): Promise<void>
    stop(): Promise<void>
    onMessage(handler: ChannelMessageHandler): void
    onStop(handler: ChannelStopHandler): void
    configure(settings: ChannelSettings): void

    readonly sendOptionsSchema?: Array<ChannelSendOptionSchema<TSendOptions>>
    resolveSession?(options: TSendOptions): Promise<SessionInterface | null>
    send?(outcome: ScheduledDeliveryOutcome, destinationSession: SessionInterface, options: TSendOptions): Promise<void>
}
