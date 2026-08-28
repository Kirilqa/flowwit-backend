import { ObservabilitySpanType } from './ObservabilitySpanType'

export type ObservabilitySpan = {
    id: string
    parentId?: string
    type: ObservabilitySpanType
    startedAt: number
    endedAt?: number
    durationMs?: number
    metadata?: Record<string, unknown>
}
