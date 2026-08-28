import { BaseRegistry } from '@core/bases'
import { WorkFlowNodeInterface } from '../interfaces/WorkFlowNodeInterface'
import { WorkFlowNodeRegistryInterface } from '../interfaces/registries/WorkFlowNodeRegistryInterface'

export class WorkFlowNodeRegistry
    extends BaseRegistry<WorkFlowNodeInterface>
    implements WorkFlowNodeRegistryInterface {}
