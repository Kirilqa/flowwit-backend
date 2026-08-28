import { ChannelRegistryInterface, ChannelConfigRepositoryInterface, ChannelConfigResolver } from '@channel'

export type CreateChannelToolsDependencies = {
    channelRegistry: ChannelRegistryInterface
    channelConfigRepository: ChannelConfigRepositoryInterface
    channelConfigResolver: ChannelConfigResolver
}
