import { ObservabilitySpan } from './ObservabilitySpan'

export type ObservabilityTrace = {
    id: string
    agentId: string
    sessionId: string
    startedAt: number
    endedAt?: number
    spans: Array<ObservabilitySpan>
    totalTokens: number
    totalCostUsd: number
}
