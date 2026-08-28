import { BaseRegistry } from '@core/bases'
import { WorkFlowInterface } from '../interfaces/WorkFlowInterface'
import { WorkFlowRegistryInterface } from '../interfaces/registries/WorkFlowRegistryInterface'

export class WorkFlowRegistry extends BaseRegistry<WorkFlowInterface> implements WorkFlowRegistryInterface {}
