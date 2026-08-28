import { z } from 'zod'
import {
    ChannelRegistryInterface,
    ChannelConfigRepositoryInterface,
    ChannelConfigResolver,
    ChannelSettings
} from '@channel'
import { AgentToolError } from '../../errors'
import { BaseChannelTool } from './bases/BaseChannelTool'
import { ChannelDetail } from './types'
import { buildChannelDetail } from './utils'
import { updateChannelToolSchema } from './validators'

export class UpdateChannelTool extends BaseChannelTool<typeof updateChannelToolSchema> {
    readonly name = 'channel_update'
    readonly description =
        'Updates settings for a channel and applies them immediately. Existing settings not included in the request are preserved. Use channel_info to discover available setting keys.'
    readonly schema = updateChannelToolSchema

    constructor(
        private readonly channelRegistry: ChannelRegistryInterface,
        private readonly channelConfigRepository: ChannelConfigRepositoryInterface,
        private readonly channelConfigResolver: ChannelConfigResolver
    ) {
        super()
    }

    protected async run(args: z.infer<typeof updateChannelToolSchema>): Promise<ChannelDetail> {
        const channel = this.channelRegistry.get(args.channelId)

        if (channel === null) {
            throw new AgentToolError(`Channel "${args.channelId}" not found`)
        }

        const channelSchema = channel.settingsSchema
        const validKeys = new Set(channelSchema.map(f => f.key))
        const unknownKeys: Array<string> = []
        const filteredSettings: ChannelSettings = {}

        for (const [key, value] of Object.entries(args.settings)) {
            if (validKeys.has(key)) {
                filteredSettings[key] = value
            } else {
                unknownKeys.push(key)
            }
        }

        if (unknownKeys.length > 0) {
            throw new AgentToolError(
                `Unknown setting keys for channel "${args.channelId}": ${unknownKeys.join(', ')}. Valid keys: ${[...validKeys].join(', ')}`
            )
        }

        const existing = await this.channelConfigRepository.findById(args.channelId)

        if (existing !== null) {
            await this.channelConfigRepository.update(args.channelId, { settings: filteredSettings })
        } else {
            await this.channelConfigRepository.create({ channelId: args.channelId, settings: filteredSettings })
        }

        const updatedConfig = await this.channelConfigRepository.findById(args.channelId)
        const resolved = this.channelConfigResolver.resolve(updatedConfig, channelSchema)
        channel.configure(resolved)

        return buildChannelDetail(channel, updatedConfig)
    }
}
