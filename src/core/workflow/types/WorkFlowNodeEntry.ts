import { InputMapping } from './InputMapping'
import { MappingValue } from './MappingValue'
import { WorkFlowNodeInterface } from '../interfaces/WorkFlowNodeInterface'

export type WorkFlowNodeEntry = {
    id: string
    node: WorkFlowNodeInterface
    portMappings: Record<string, Array<InputMapping>>
    configOverrides: Record<string, MappingValue>
}
