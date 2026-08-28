import { ObservabilityTrace } from '../../../types'
import { SpanMeta } from './SpanMeta'

export type TraceMeta = {
    trace: ObservabilityTrace
    spanMeta: Map<string, SpanMeta>
    lastIterationCostUsd: number
}
