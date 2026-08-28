import { ObservabilityTrace } from '../../../types'
import { SpanMeta } from './SpanMeta'

export type TraceMeta = {
    trace: ObservabilityTrace
    lastIterationCostUsd: number
    spanMeta: Map<string, SpanMeta>
    activeDepths: Set<number>
    startedAt: number
}
