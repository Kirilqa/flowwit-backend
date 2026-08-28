import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { RawAgentConfig } from '../../types'

export interface RawAgentConfigRepositoryInterface
    extends RepositoryInterface<RawAgentConfig>, InitializableInterface<Array<RawAgentConfig>> {}
