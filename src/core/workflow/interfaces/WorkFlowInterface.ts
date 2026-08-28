import { WorkFlowConnection } from '../types/WorkFlowConnection'
import { WorkFlowConnectionInput } from '../types/WorkFlowConnectionInput'
import { WorkFlowNodeEntry } from '../types/WorkFlowNodeEntry'
import { WorkFlowValidationResult } from '../types/WorkFlowValidationResult'
import { InputMapping } from '../types/InputMapping'
import { MappingValue } from '../types/MappingValue'
import { WorkFlowNodeInterface } from './WorkFlowNodeInterface'

export interface WorkFlowInterface {
    readonly id: string
    readonly name: string
    readonly description?: string
    validate(): WorkFlowValidationResult
    getEntries(): Array<WorkFlowNodeEntry>
    getConnections(): Array<WorkFlowConnection>
    findEntryById(id: string): WorkFlowNodeEntry | null
    findStartEntries(): Array<WorkFlowNodeEntry>
    findFinalEntries(): Array<WorkFlowNodeEntry>
    addNode(id: string, node: WorkFlowNodeInterface): void
    removeNode(id: string): void
    addConnection(connection: WorkFlowConnectionInput): void
    removeConnection(connectionId: string): void
    setPortMapping(nodeId: string, port: string, mappings: Array<InputMapping>): void
    setConfigOverride(nodeId: string, key: string, value: MappingValue): void
}
