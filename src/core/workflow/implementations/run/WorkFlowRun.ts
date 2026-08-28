import { randomUUID } from 'crypto'
import { WorkFlowRunInterface } from '../../interfaces/WorkFlowRunInterface'
import { WorkFlowInterface } from '../../interfaces/WorkFlowInterface'
import { WorkFlowRunNodeEntry } from '../../types/WorkFlowRunNodeEntry'
import { WorkFlowConnection } from '../../types/WorkFlowConnection'
import { WorkFlowRunStatus } from '../../types/WorkFlowRunStatus'
import { SerializedWorkFlowRun } from '../../types/SerializedWorkFlowRun'
import { WORKFLOW_RUN_STATUS } from '../../types/WorkFlowRunStatus'
import { WORKFLOW_NODE_STATE_STATUS } from '../../types/WorkFlowNodeStateStatus'

export class WorkFlowRun implements WorkFlowRunInterface {
    readonly id: string
    readonly workflowId: string
    readonly createdAt: number

    private _status: WorkFlowRunStatus
    private _updatedAt: number
    private readonly _input: unknown
    private readonly _entries: Array<WorkFlowRunNodeEntry>
    private readonly _connections: Array<WorkFlowConnection>

    get status(): WorkFlowRunStatus {
        return this._status
    }

    get input(): unknown {
        return this._input
    }

    get updatedAt(): number {
        return this._updatedAt
    }

    constructor(input: unknown, workFlow: WorkFlowInterface, serialized?: SerializedWorkFlowRun) {
        this.id = serialized?.id ?? randomUUID()
        this.workflowId = serialized?.workflowId ?? workFlow.id
        this.createdAt = serialized?.createdAt ?? Date.now()
        this._status = serialized?.status ?? WORKFLOW_RUN_STATUS.PENDING
        this._updatedAt = serialized?.updatedAt ?? Date.now()
        this._input = input
        this._connections = [...workFlow.getConnections()]

        this._entries = workFlow.getEntries().map(entry => {
            const serializedEntry = serialized?.entries.find(e => e.id === entry.id)

            return {
                ...entry,
                executions: serializedEntry?.executions ?? {}
            }
        })
    }

    getEntries(): Array<WorkFlowRunNodeEntry> {
        return this._entries
    }

    getConnections(): Array<WorkFlowConnection> {
        return this._connections
    }

    getEntryById(id: string): WorkFlowRunNodeEntry | null {
        return this._entries.find(entry => entry.id === id) ?? null
    }

    getOutput(): Record<string, unknown> {
        const nodesWithOutgoingConnections = new Set(this._connections.map(connection => connection.sourceNodeId))

        return this._entries
            .filter(entry => !nodesWithOutgoingConnections.has(entry.id))
            .reduce<Record<string, unknown>>((accumulator, entry) => {
                const completedExecutions = Object.values(entry.executions).filter(
                    execution => execution.status === WORKFLOW_NODE_STATE_STATUS.COMPLETED
                )

                const lastExecution = completedExecutions[completedExecutions.length - 1]

                accumulator[entry.id] = lastExecution?.output
                return accumulator
            }, {})
    }

    setStatus(status: WorkFlowRunStatus): void {
        this._status = status
        this._updatedAt = Date.now()
    }
}
