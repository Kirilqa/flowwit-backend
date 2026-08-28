import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { ChannelConfig } from '../../types/ChannelConfig'

export interface ChannelConfigRepositoryInterface extends RepositoryInterface<ChannelConfig>, InitializableInterface {}
