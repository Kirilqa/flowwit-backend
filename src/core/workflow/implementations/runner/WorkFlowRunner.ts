import { randomUUID } from 'crypto'
import { WorkFlowRunnerInterface } from '../../interfaces/WorkFlowRunnerInterface'
import { WorkFlowRunInterface } from '../../interfaces/WorkFlowRunInterface'
import { WorkFlowRunRepositoryInterface } from '../../interfaces/repositories/WorkFlowRunRepositoryInterface'
import { WorkFlowRunNodeEntry } from '../../types/WorkFlowRunNodeEntry'
import { WorkFlowRunnerPendingEntry } from '../../types/WorkFlowRunnerPendingEntry'
import { WorkFlowEvent } from '../../types/WorkFlowEvent'
import { WorkFlowRunnerPendingItem } from '../../types/WorkFlowRunnerPendingItem'
import { WORKFLOW_EVENT_TYPE } from '../../types/WorkFlowEventType'
import { WORKFLOW_NODE_STATE_STATUS } from '../../types/WorkFlowNodeStateStatus'
import { WORKFLOW_RUN_STATUS } from '../../types/WorkFlowRunStatus'
import { WorkFlowRunError } from '../../errors/WorkFlowRunError'
import { WorkFlowRunAbortError } from '../../errors/WorkFlowRunAbortError'
import { WorkFlowNodeNotFoundError } from '../../errors/WorkFlowNodeNotFoundError'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { evaluateMappingValue } from '../../utils/evaluateMappingValue'
import { WorkFlowRunnerChildExecutionEntry } from '../../types'
import { createAbortPromise, getErrorMessage } from '@core/utils'

export class WorkFlowRunner implements WorkFlowRunnerInterface {
    private readonly abortControllers = new Map<string, AbortController>()

    constructor(private readonly runRepository?: WorkFlowRunRepositoryInterface) {}

    async *run(run: WorkFlowRunInterface): AsyncIterable<WorkFlowEvent> {
        const abortController = new AbortController()
        this.abortControllers.set(run.id, abortController)

        try {
            yield* this.executeRun(run, abortController.signal)
        } finally {
            this.abortControllers.delete(run.id)
        }
    }

    async stop(runId: string): Promise<void> {
        const controller = this.abortControllers.get(runId)

        if (!controller) return

        controller.abort()
        this.abortControllers.delete(runId)
    }

    private async *executeRun(run: WorkFlowRunInterface, signal: AbortSignal): AsyncIterable<WorkFlowEvent> {
        run.setStatus(WORKFLOW_RUN_STATUS.RUNNING)
        await this.runRepository?.update(run.id, run)

        yield {
            id: randomUUID(),
            runId: run.id,
            type: WORKFLOW_EVENT_TYPE.RUN_STARTED,
            createdAt: Date.now()
        }

        const startEntries = run.getEntries().filter(entry => entry.node.isStart)

        if (startEntries.length === 0) {
            throw new WorkFlowRunError(`WorkFlow run "${run.id}" has no start nodes`)
        }

        const initialExecutionId = randomUUID()
        const childToParent = new Map<string, WorkFlowRunnerChildExecutionEntry>()

        const pendingEntries: Array<WorkFlowRunnerPendingEntry> = startEntries.map(entry => {
            entry.executions[initialExecutionId] = {
                executionId: initialExecutionId,
                status: WORKFLOW_NODE_STATE_STATUS.PENDING,
                receivedPorts: { $input: run.input }
            }

            return { entry, executionId: initialExecutionId }
        })

        try {
            yield* this.executeEntries(pendingEntries, run, childToParent, signal)

            run.setStatus(WORKFLOW_RUN_STATUS.COMPLETED)
            await this.runRepository?.update(run.id, run)

            yield {
                id: randomUUID(),
                runId: run.id,
                type: WORKFLOW_EVENT_TYPE.RUN_COMPLETED,
                output: run.getOutput(),
                createdAt: Date.now()
            }
        } catch (error) {
            run.setStatus(WORKFLOW_RUN_STATUS.FAILED)
            await this.runRepository?.update(run.id, run)

            yield {
                id: randomUUID(),
                runId: run.id,
                type: WORKFLOW_EVENT_TYPE.RUN_FAILED,
                error: getErrorMessage(error),
                createdAt: Date.now()
            }
        }
    }

    private async *executeEntries(
        pendingEntries: Array<WorkFlowRunnerPendingEntry>,
        run: WorkFlowRunInterface,
        childToParent: Map<string, WorkFlowRunnerChildExecutionEntry>,
        signal: AbortSignal
    ): AsyncIterable<WorkFlowEvent> {
        const streams = pendingEntries.map(({ entry, executionId }) =>
            this.executeEntry(entry, executionId, run, childToParent, signal)
        )

        yield* this.mergeStreams(streams)
    }

    private async *executeEntry(
        entry: WorkFlowRunNodeEntry,
        executionId: string,
        run: WorkFlowRunInterface,
        childToParent: Map<string, WorkFlowRunnerChildExecutionEntry>,
        signal: AbortSignal
    ): AsyncIterable<WorkFlowEvent> {
        if (signal.aborted) return

        const execution = entry.executions[executionId]

        if (execution === undefined) return

        if (
            execution.status === WORKFLOW_NODE_STATE_STATUS.COMPLETED ||
            execution.status === WORKFLOW_NODE_STATE_STATUS.RUNNING ||
            execution.status === WORKFLOW_NODE_STATE_STATUS.FAILED
        )
            return

        const receivedPortKeys = new Set(Object.keys(execution.receivedPorts))

        if (!entry.node.isReady(receivedPortKeys)) return

        const ports = entry.node.resolvePortsThroughSchema(this.resolvePorts(entry, execution.receivedPorts))
        const config = entry.node.resolveConfigThroughSchema(this.resolveConfig(entry, execution.receivedPorts))

        execution.status = WORKFLOW_NODE_STATE_STATUS.RUNNING
        execution.resolvedPorts = ports
        execution.resolvedConfig = config
        execution.startedAt = Date.now()
        await this.runRepository?.update(run.id, run)

        yield {
            id: randomUUID(),
            runId: run.id,
            nodeId: entry.id,
            executionId,
            type: WORKFLOW_EVENT_TYPE.NODE_STARTED,
            input: ports,
            config,
            createdAt: Date.now()
        }

        try {
            const result = yield* this.executeNode(entry, executionId, run.id, ports, config, signal)

            const hasNewBranch =
                result.executionIds !== undefined && Object.values(result.executionIds).some(value => value === true)

            execution.status = hasNewBranch ? WORKFLOW_NODE_STATE_STATUS.PENDING : WORKFLOW_NODE_STATE_STATUS.COMPLETED
            execution.output = result.output
            execution.completedAt = Date.now()

            if (result.state !== undefined) {
                execution.state = result.state
            }

            await this.runRepository?.update(run.id, run)

            yield {
                id: randomUUID(),
                runId: run.id,
                nodeId: entry.id,
                executionId,
                type: WORKFLOW_EVENT_TYPE.NODE_COMPLETED,
                output: result.output,
                createdAt: Date.now()
            }

            const outgoingConnections = run.getConnections().filter(connection => connection.sourceNodeId === entry.id)

            if (outgoingConnections.length === 0) return

            const nextPendingEntries: Array<WorkFlowRunnerPendingEntry> = []

            for (const connection of outgoingConnections) {
                const targetEntry = run.getEntryById(connection.targetNodeId)

                if (targetEntry === null) {
                    throw new WorkFlowNodeNotFoundError(
                        `Target node "${connection.targetNodeId}" not found in run "${run.id}"`
                    )
                }

                const outputValue = result.output[connection.sourcePort]

                if (outputValue === undefined) continue

                const isNewBranch = result.executionIds?.[connection.sourcePort] === true

                let targetExecutionId: string

                if (isNewBranch) {
                    targetExecutionId = randomUUID()
                    childToParent.set(targetExecutionId, {
                        parentExecutionId: executionId,
                        nodeId: entry.id
                    })
                } else {
                    const childEntry = childToParent.get(executionId)

                    if (childEntry?.nodeId === targetEntry.id) {
                        targetExecutionId = childEntry.parentExecutionId
                    } else {
                        targetExecutionId = executionId
                    }
                }

                const existingExecution = targetEntry.executions[targetExecutionId]

                if (existingExecution !== undefined) {
                    existingExecution.receivedPorts[connection.targetPort] = outputValue
                } else {
                    targetEntry.executions[targetExecutionId] = {
                        executionId: targetExecutionId,
                        status: WORKFLOW_NODE_STATE_STATUS.PENDING,
                        receivedPorts: { [connection.targetPort]: outputValue }
                    }
                }

                const alreadyPending = nextPendingEntries.some(
                    pending => pending.entry.id === targetEntry.id && pending.executionId === targetExecutionId
                )

                if (!alreadyPending) {
                    nextPendingEntries.push({ entry: targetEntry, executionId: targetExecutionId })
                }
            }

            await this.runRepository?.update(run.id, run)

            yield* this.executeEntries(nextPendingEntries, run, childToParent, signal)
        } catch (error) {
            execution.status = WORKFLOW_NODE_STATE_STATUS.FAILED
            execution.error = getErrorMessage(error)
            execution.completedAt = Date.now()
            await this.runRepository?.update(run.id, run)

            if (!(error instanceof WorkFlowRunAbortError)) {
                yield {
                    id: randomUUID(),
                    runId: run.id,
                    nodeId: entry.id,
                    executionId,
                    type: WORKFLOW_EVENT_TYPE.NODE_FAILED,
                    error: execution.error,
                    createdAt: Date.now()
                }
            }

            throw error
        }
    }

    private async *executeNode(
        entry: WorkFlowRunNodeEntry,
        executionId: string,
        runId: string,
        ports: Record<string, unknown>,
        config: Record<string, unknown>,
        signal: AbortSignal
    ): AsyncGenerator<WorkFlowEvent, WorkFlowNodeResult> {
        const execution = entry.executions[executionId]
        const generator: AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult> = entry.node.execute(
            ports,
            config,
            execution?.state
        )

        const { promise: abortPromise, cleanup } = createAbortPromise(signal, () => new WorkFlowRunAbortError())

        try {
            while (true) {
                if (signal.aborted) throw new WorkFlowRunAbortError()

                const step = await Promise.race([generator.next(), abortPromise])

                if (step.done === true) return step.value

                yield { ...step.value, id: randomUUID(), runId, nodeId: entry.id, executionId }
            }
        } finally {
            cleanup()
        }
    }

    private resolvePorts(entry: WorkFlowRunNodeEntry, receivedPorts: Record<string, unknown>): Record<string, unknown> {
        const resolved: Record<string, unknown> = {}

        for (const [port, data] of Object.entries(receivedPorts)) {
            const mappings = entry.portMappings[port]

            if (mappings === undefined || mappings.length === 0) {
                resolved[port] = data
                continue
            }

            for (const mapping of mappings) {
                resolved[mapping.targetParameter] = evaluateMappingValue(mapping.value, receivedPorts, data)
            }
        }

        return resolved
    }

    private resolveConfig(
        entry: WorkFlowRunNodeEntry,
        receivedPorts: Record<string, unknown>
    ): Record<string, unknown> {
        const resolved: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(entry.configOverrides)) {
            resolved[key] = evaluateMappingValue(value, receivedPorts)
        }

        return resolved
    }

    private async *mergeStreams(streams: Array<AsyncIterable<WorkFlowEvent>>): AsyncIterable<WorkFlowEvent> {
        const iterators = streams.map(stream => stream[Symbol.asyncIterator]())

        const nextFrom = (iterator: AsyncIterator<WorkFlowEvent>, index: number): WorkFlowRunnerPendingItem => ({
            index,
            promise: iterator.next().then(result => ({ index, result }))
        })

        const pending = new Map<number, WorkFlowRunnerPendingItem>(
            iterators.map((iterator, index) => [index, nextFrom(iterator, index)])
        )

        while (pending.size > 0) {
            const { index, result } = await Promise.race([...pending.values()].map(item => item.promise))

            pending.delete(index)

            if (result.done) continue

            yield result.value

            const iterator = iterators[index]

            if (iterator !== undefined) {
                pending.set(index, nextFrom(iterator, index))
            }
        }
    }
}
