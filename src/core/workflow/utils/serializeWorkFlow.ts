import { WorkFlowInterface } from '../interfaces/WorkFlowInterface'
import { SerializedWorkFlow } from '../types/SerializedWorkFlow'
import { SerializedWorkFlowNodeEntry } from '../types/SerializedWorkFlowNodeEntry'
import { MappingValue } from '../types/MappingValue'

export function serializeWorkFlow(workflow: WorkFlowInterface): SerializedWorkFlow {
    const entries: Array<SerializedWorkFlowNodeEntry> = workflow.getEntries().map(entry => {
        const configOverrides: Record<string, MappingValue> = {}

        for (const [key, value] of Object.entries(entry.configOverrides)) {
            if (value.type === 'function') continue
            configOverrides[key] = value
        }

        const portMappings: Record<string, (typeof entry.portMappings)[string]> = {}

        for (const [port, mappings] of Object.entries(entry.portMappings)) {
            const filtered = mappings.filter(mapping => mapping.value.type !== 'function')
            if (filtered.length > 0) {
                portMappings[port] = filtered
            }
        }

        return {
            id: entry.id,
            nodeType: entry.node.type,
            portMappings,
            configOverrides
        }
    })

    return {
        id: workflow.id,
        name: workflow.name,
        ...(workflow.description !== undefined && { description: workflow.description }),
        entries,
        connections: workflow.getConnections()
    }
}
