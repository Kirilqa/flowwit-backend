import { BaseRegistry } from '@core/bases'
import { ProviderInterface, ProviderRegistryInterface } from '../interfaces'

export class ProviderRegistry extends BaseRegistry<ProviderInterface> implements ProviderRegistryInterface {}
