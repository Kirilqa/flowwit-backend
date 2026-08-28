import { randomUUID } from 'crypto'
import { WorkFlowInterface, WorkFlowNodeInterface } from '../../interfaces'
import {
    WorkFlowNodeEntry,
    WorkFlowConnection,
    WorkFlowConnectionInput,
    WorkFlowValidationResult,
    InputMapping,
    MappingValue
} from '../../types'
import { WorkFlowNodeNotFoundError, WorkFlowNodeAlreadyExistsError, WorkFlowConnectionError } from '../../errors'

export class WorkFlow implements WorkFlowInterface {
    readonly id: string
    readonly name: string
    readonly description?: string

    private readonly _entries: Array<WorkFlowNodeEntry> = []
    private readonly _connections: Array<WorkFlowConnection> = []

    constructor(id: string, name: string, description?: string) {
        this.id = id
        this.name = name
        if (description) this.description = description
    }

    getEntries(): Array<WorkFlowNodeEntry> {
        return this._entries
    }

    getConnections(): Array<WorkFlowConnection> {
        return this._connections
    }

    findEntryById(id: string): WorkFlowNodeEntry | null {
        return this._entries.find(entry => entry.id === id) ?? null
    }

    findStartEntries(): Array<WorkFlowNodeEntry> {
        const nodesWithIncomingConnections = new Set(this._connections.map(connection => connection.targetNodeId))

        return this._entries.filter(entry => !nodesWithIncomingConnections.has(entry.id) && entry.node.isStart)
    }

    findFinalEntries(): Array<WorkFlowNodeEntry> {
        const nodesWithOutgoingConnections = new Set(this._connections.map(connection => connection.sourceNodeId))

        return this._entries.filter(entry => !nodesWithOutgoingConnections.has(entry.id))
    }

    validate(): WorkFlowValidationResult {
        const errors: Array<string> = []
        const nodeIds = new Set(this._entries.map(entry => entry.id))
        const incomingPortsByNode = new Map<string, Set<string>>()

        for (const connection of this._connections) {
            if (!nodeIds.has(connection.sourceNodeId)) {
                errors.push(
                    `Connection "${connection.id}" references non-existent source node "${connection.sourceNodeId}"`
                )
            }

            if (!nodeIds.has(connection.targetNodeId)) {
                errors.push(
                    `Connection "${connection.id}" references non-existent target node "${connection.targetNodeId}"`
                )
            }

            const sourceEntry = this._entries.find(e => e.id === connection.sourceNodeId)
            const targetEntry = this._entries.find(e => e.id === connection.targetNodeId)

            if (sourceEntry !== undefined) {
                const outputPorts = this.getSchemaProperties(sourceEntry.node.outputsJsonSchema)
                if (outputPorts !== null && !outputPorts.has(connection.sourcePort)) {
                    errors.push(
                        `Connection "${connection.id}": port "${connection.sourcePort}" does not exist on node "${connection.sourceNodeId}" outputs`
                    )
                }
            }

            if (targetEntry !== undefined) {
                const inputPorts = this.getSchemaProperties(targetEntry.node.portsJsonSchema)
                if (inputPorts !== null && !inputPorts.has(connection.targetPort)) {
                    errors.push(
                        `Connection "${connection.id}": port "${connection.targetPort}" does not exist on node "${connection.targetNodeId}" inputs`
                    )
                }

                const existing = incomingPortsByNode.get(connection.targetNodeId)
                if (existing !== undefined) {
                    existing.add(connection.targetPort)
                } else {
                    incomingPortsByNode.set(connection.targetNodeId, new Set([connection.targetPort]))
                }
            }
        }

        if (this.findStartEntries().length === 0) {
            errors.push('WorkFlow must have at least one start node')
        }

        const nodesWithIncomingConnections = new Set(this._connections.map(c => c.targetNodeId))

        for (const entry of this._entries) {
            const isStartEntry = entry.node.isStart && !nodesWithIncomingConnections.has(entry.id)
            const validPortMappingKeys = new Set<string>(incomingPortsByNode.get(entry.id) ?? [])
            if (isStartEntry) validPortMappingKeys.add('$input')

            const configProps = this.getSchemaProperties(entry.node.configJsonSchema)
            const portProps = this.getSchemaProperties(entry.node.portsJsonSchema)

            for (const key of Object.keys(entry.configOverrides)) {
                if (configProps !== null && !configProps.has(key)) {
                    errors.push(
                        `Node "${entry.id}": configOverride key "${key}" does not exist in "${entry.node.type}" config schema`
                    )
                }
            }

            for (const [port, mappings] of Object.entries(entry.portMappings)) {
                if (!validPortMappingKeys.has(port)) {
                    errors.push(`Node "${entry.id}": portMapping key "${port}" is not an incoming port on this node`)
                }

                if (portProps !== null) {
                    for (const mapping of mappings) {
                        if (!portProps.has(mapping.targetParameter)) {
                            errors.push(
                                `Node "${entry.id}": portMapping targetParameter "${mapping.targetParameter}" does not exist in "${entry.node.type}" ports schema`
                            )
                        }
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }

    private getSchemaProperties(schema: Record<string, unknown>): Set<string> | null {
        const properties = schema['properties']
        if (typeof properties !== 'object' || properties === null) return null
        return new Set(Object.keys(properties))
    }

    addNode(id: string, node: WorkFlowNodeInterface): void {
        if (this._entries.some(entry => entry.id === id)) {
            throw new WorkFlowNodeAlreadyExistsError(`Node with id "${id}" already exists in workflow "${this.id}"`)
        }

        this._entries.push({
            id,
            node,
            portMappings: {},
            configOverrides: {}
        })
    }

    removeNode(id: string): void {
        const index = this._entries.findIndex(entry => entry.id === id)

        if (index === -1) {
            throw new WorkFlowNodeNotFoundError(`Node "${id}" does not exist in workflow "${this.id}"`)
        }

        this._entries.splice(index, 1)

        const connectionsToRemove = this._connections
            .map((connection, i) => ({ connection, i }))
            .filter(({ connection }) => connection.sourceNodeId === id || connection.targetNodeId === id)
            .map(({ i }) => i)
            .reverse()

        for (const i of connectionsToRemove) {
            this._connections.splice(i, 1)
        }
    }

    addConnection(connection: WorkFlowConnectionInput): void {
        if (this.findEntryById(connection.sourceNodeId) === null) {
            throw new WorkFlowNodeNotFoundError(
                `Source node "${connection.sourceNodeId}" does not exist in workflow "${this.id}"`
            )
        }

        if (this.findEntryById(connection.targetNodeId) === null) {
            throw new WorkFlowNodeNotFoundError(
                `Target node "${connection.targetNodeId}" does not exist in workflow "${this.id}"`
            )
        }

        const existingConnection = this._connections.find(
            existing =>
                existing.targetNodeId === connection.targetNodeId && existing.targetPort === connection.targetPort
        )

        if (existingConnection !== undefined) {
            throw new WorkFlowConnectionError(
                `Port "${connection.targetPort}" on node "${connection.targetNodeId}" already has an incoming connection`
            )
        }

        this._connections.push({
            ...connection,
            id: connection.id ?? randomUUID()
        })
    }

    removeConnection(connectionId: string): void {
        const index = this._connections.findIndex(connection => connection.id === connectionId)

        if (index === -1) {
            throw new WorkFlowConnectionError(`Connection "${connectionId}" does not exist in workflow "${this.id}"`)
        }

        this._connections.splice(index, 1)
    }

    setPortMapping(nodeId: string, port: string, mappings: Array<InputMapping>): void {
        const entry = this.findEntryById(nodeId)

        if (entry === null) {
            throw new WorkFlowNodeNotFoundError(`Node "${nodeId}" does not exist in workflow "${this.id}"`)
        }

        entry.portMappings[port] = mappings
    }

    setConfigOverride(nodeId: string, key: string, value: MappingValue): void {
        const entry = this.findEntryById(nodeId)

        if (entry === null) {
            throw new WorkFlowNodeNotFoundError(`Node "${nodeId}" does not exist in workflow "${this.id}"`)
        }

        entry.configOverrides[key] = value
    }
}
