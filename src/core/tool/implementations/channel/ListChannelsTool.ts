import { z } from 'zod'
import { ChannelRegistryInterface, ChannelConfigRepositoryInterface } from '@channel'
import { BaseChannelTool } from './bases/BaseChannelTool'
import { ChannelDetail } from './types'
import { buildChannelDetail } from './utils'
import { listChannelsToolSchema } from './validators'

export class ListChannelsTool extends BaseChannelTool<typeof listChannelsToolSchema> {
    readonly name = 'channel_list'
    readonly description =
        'Lists all available channels with their current settings. Private settings show only whether a value is set or not.'
    readonly schema = listChannelsToolSchema

    constructor(
        private readonly channelRegistry: ChannelRegistryInterface,
        private readonly channelConfigRepository: ChannelConfigRepositoryInterface
    ) {
        super()
    }

    protected async run(_args: z.infer<typeof listChannelsToolSchema>): Promise<Array<ChannelDetail>> {
        const channels = this.channelRegistry.list()
        return Promise.all(
            channels.map(async channel => {
                const config = await this.channelConfigRepository.findById(channel.id)
                return buildChannelDetail(channel, config)
            })
        )
    }
}
