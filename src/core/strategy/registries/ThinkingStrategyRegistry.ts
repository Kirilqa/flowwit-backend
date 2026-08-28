import { BaseRegistry } from '@core/bases'
import { ThinkingStrategyInterface, ThinkingStrategyRegistryInterface } from '../interfaces'

export class ThinkingStrategyRegistry
    extends BaseRegistry<ThinkingStrategyInterface>
    implements ThinkingStrategyRegistryInterface {}
