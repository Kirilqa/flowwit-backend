import { WorkFlowEvent } from '@workflow'
import { WorkFlowBusEntry } from './types/WorkFlowBusEntry'
import { WorkFlowBusSubscriberCallback } from './types/WorkFlowBusSubscriberCallback'

export class WorkFlowRunEventBus {
    private readonly entries = new Map<string, WorkFlowBusEntry>()

    start(runId: string, stream: AsyncIterable<WorkFlowEvent>): void {
        const entry: WorkFlowBusEntry = {
            buffer: [],
            subscribers: new Set(),
            onCompleteCallbacks: new Set(),
            completed: false
        }

        this.entries.set(runId, entry)

        void this.consume(stream, entry)
    }

    subscribe(runId: string): AsyncIterable<WorkFlowEvent> {
        const entry = this.entries.get(runId)

        if (entry === undefined) {
            return this.emptyIterable()
        }

        return this.buildIterable(entry)
    }

    isActive(runId: string): boolean {
        const entry = this.entries.get(runId)
        return entry !== undefined && !entry.completed
    }

    hasRun(runId: string): boolean {
        return this.entries.has(runId)
    }

    private async consume(stream: AsyncIterable<WorkFlowEvent>, entry: WorkFlowBusEntry): Promise<void> {
        try {
            for await (const event of stream) {
                entry.buffer.push(event)

                for (const subscriber of entry.subscribers) {
                    subscriber(event)
                }
            }
        } finally {
            entry.completed = true

            for (const callback of entry.onCompleteCallbacks) {
                callback()
            }
        }
    }

    private async *buildIterable(entry: WorkFlowBusEntry): AsyncIterable<WorkFlowEvent> {
        const buffered = [...entry.buffer]

        for (const event of buffered) {
            yield event
        }

        if (entry.completed) return

        yield* this.buildLiveIterable(entry)
    }

    private buildLiveIterable(entry: WorkFlowBusEntry): AsyncIterable<WorkFlowEvent> {
        const queue: Array<WorkFlowEvent> = []
        let resolve: (() => void) | null = null
        let completed = false

        const eventCallback: WorkFlowBusSubscriberCallback = event => {
            queue.push(event)
            resolve?.()
            resolve = null
        }

        const completeCallback = () => {
            completed = true
            resolve?.()
            resolve = null
        }

        entry.subscribers.add(eventCallback)
        entry.onCompleteCallbacks.add(completeCallback)

        const waitForNext = (): Promise<void> =>
            new Promise(res => {
                resolve = res
            })

        async function* generate(): AsyncGenerator<WorkFlowEvent> {
            try {
                while (true) {
                    const event = queue.shift()

                    if (event !== undefined) {
                        yield event
                        continue
                    }

                    if (completed) return

                    await waitForNext()
                }
            } finally {
                entry.subscribers.delete(eventCallback)
                entry.onCompleteCallbacks.delete(completeCallback)
            }
        }

        return generate()
    }

    private async *emptyIterable(): AsyncIterable<WorkFlowEvent> {}
}
