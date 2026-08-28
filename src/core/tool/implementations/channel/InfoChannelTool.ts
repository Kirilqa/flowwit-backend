import { z } from 'zod'
import { ChannelRegistryInterface, ChannelConfigRepositoryInterface } from '@channel'
import { AgentToolError } from '../../errors'
import { BaseChannelTool } from './bases/BaseChannelTool'
import { ChannelDetail } from './types'
import { buildChannelDetail } from './utils'
import { infoChannelToolSchema } from './validators'

export class InfoChannelTool extends BaseChannelTool<typeof infoChannelToolSchema> {
    readonly name = 'channel_info'
    readonly description =
        'Returns the full settings schema for a specific channel. Private settings show only whether a value is set or not.'
    readonly schema = infoChannelToolSchema

    constructor(
        private readonly channelRegistry: ChannelRegistryInterface,
        private readonly channelConfigRepository: ChannelConfigRepositoryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof infoChannelToolSchema>): Promise<ChannelDetail> {
        const channel = this.channelRegistry.get(args.channelId)

        if (channel === null) {
            throw new AgentToolError(`Channel "${args.channelId}" not found`)
        }

        const config = await this.channelConfigRepository.findById(args.channelId)
        return buildChannelDetail(channel, config)
    }
}
