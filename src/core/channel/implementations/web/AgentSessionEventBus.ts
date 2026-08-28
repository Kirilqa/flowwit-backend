import { AgentEvent } from '@agent'
import { AgentSessionBusEntry } from './types/AgentSessionBusEntry'
import { AgentSessionBusSubscriberCallback } from './types/AgentSessionBusSubscriberCallback'

export class AgentSessionEventBus {
    private readonly entries = new Map<string, AgentSessionBusEntry>()

    start(sessionId: string, stream: AsyncIterable<AgentEvent>): void {
        const entry: AgentSessionBusEntry = {
            buffer: [],
            subscribers: new Set(),
            onCompleteCallbacks: new Set(),
            completed: false
        }

        this.entries.set(sessionId, entry)

        void this.consume(sessionId, stream, entry)
    }

    subscribe(sessionId: string): AsyncIterable<AgentEvent> {
        const entry = this.entries.get(sessionId)

        if (entry === undefined) {
            return this.emptyIterable()
        }

        return this.buildIterable(entry)
    }

    isActive(sessionId: string): boolean {
        const entry = this.entries.get(sessionId)
        return entry !== undefined && !entry.completed
    }

    private async consume(
        sessionId: string,
        stream: AsyncIterable<AgentEvent>,
        entry: AgentSessionBusEntry
    ): Promise<void> {
        try {
            for await (const event of stream) {
                entry.buffer.push(event)

                for (const subscriber of entry.subscribers) {
                    subscriber(event)
                }
            }
        } catch {
        } finally {
            entry.completed = true
            this.entries.delete(sessionId)

            for (const callback of entry.onCompleteCallbacks) {
                callback()
            }
        }
    }

    private async *buildIterable(entry: AgentSessionBusEntry): AsyncIterable<AgentEvent> {
        const buffered = [...entry.buffer]

        for (const event of buffered) {
            yield event
        }

        if (entry.completed) return

        yield* this.buildLiveIterable(entry)
    }

    private buildLiveIterable(entry: AgentSessionBusEntry): AsyncIterable<AgentEvent> {
        const queue: Array<AgentEvent> = []
        let resolve: (() => void) | null = null
        let completed = false

        const eventCallback: AgentSessionBusSubscriberCallback = event => {
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

        async function* generate(): AsyncGenerator<AgentEvent> {
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

    private async *emptyIterable(): AsyncIterable<AgentEvent> {}
}
