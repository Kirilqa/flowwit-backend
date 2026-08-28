import { InitializableInterface, RepositoryInterface } from '@core/interfaces'
import { MCPServerConfig } from '../../types'

export interface MCPServerConfigRepositoryInterface
    extends RepositoryInterface<MCPServerConfig>, InitializableInterface {}
