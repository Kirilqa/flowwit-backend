import { WorkFlow } from '../implementations/workflow/WorkFlow'
import { WorkFlowNodeNotFoundError } from '../errors/WorkFlowNodeNotFoundError'
import { WorkFlowNodeRegistryInterface } from '../interfaces/registries/WorkFlowNodeRegistryInterface'
import { WorkFlowInterface } from '../interfaces/WorkFlowInterface'
import { SerializedWorkFlow } from '../types/SerializedWorkFlow'

export function deserializeWorkFlow(
    serialized: SerializedWorkFlow,
    nodeRegistry: WorkFlowNodeRegistryInterface
): WorkFlowInterface {
    const workflow = new WorkFlow(serialized.id, serialized.name, serialized.description)

    for (const entry of serialized.entries) {
        const node = nodeRegistry.get(entry.nodeType)

        if (node === null) {
            throw new WorkFlowNodeNotFoundError(`Node type "${entry.nodeType}" not found in registry`)
        }

        workflow.addNode(entry.id, node)

        for (const [port, mappings] of Object.entries(entry.portMappings)) {
            if (mappings.length > 0) {
                workflow.setPortMapping(entry.id, port, mappings)
            }
        }

        for (const [key, value] of Object.entries(entry.configOverrides)) {
            workflow.setConfigOverride(entry.id, key, value)
        }
    }

    for (const connection of serialized.connections) {
        workflow.addConnection(connection)
    }

    return workflow
}
