import { InputMapping } from './InputMapping'
import { MappingValue } from './MappingValue'

export type SerializedWorkFlowNodeEntry = {
    id: string
    nodeType: string
    portMappings: Record<string, Array<InputMapping>>
    configOverrides: Record<string, MappingValue>
}
