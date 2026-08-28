import { randomUUID } from 'crypto'
import { ObservabilityInterface } from '../interfaces'
import { ObservabilityTrace } from '../types'

export class NoopObservability implements ObservabilityInterface {
    async startTrace(agentId: string, sessionId: string): Promise<ObservabilityTrace> {
        return {
            id: randomUUID(),
            agentId,
            sessionId,
            startedAt: Date.now(),
            spans: [],
            totalTokens: 0,
            totalCostUsd: 0
        }
    }

    async endTrace(): Promise<void> {}

    async startSpan(): Promise<void> {}

    async endSpan(): Promise<void> {}

    async recordEvent(): Promise<void> {}

    async getTrace(): Promise<ObservabilityTrace | null> {
        return null
    }

    async listTraces(): Promise<Array<ObservabilityTrace>> {
        return []
    }
}
