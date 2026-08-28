import { ObservabilitySpanType } from '../../../types'

export type SpanMeta = {
    type: ObservabilitySpanType
    startedAt: number
    parentId?: string
}
