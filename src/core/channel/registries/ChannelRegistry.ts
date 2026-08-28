import { BaseRegistry } from '@core/bases'
import { ChannelInterface } from '../interfaces/ChannelInterface'
import { ChannelRegistryInterface } from '../interfaces/registries/ChannelRegistryInterface'

export class ChannelRegistry extends BaseRegistry<ChannelInterface> implements ChannelRegistryInterface {}
