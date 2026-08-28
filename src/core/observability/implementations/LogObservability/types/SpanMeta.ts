import { ObservabilitySpanType } from '../../../types'

export type SpanMeta = {
    depth: number
    startedAt: number
    type: ObservabilitySpanType
    parentId: string | undefined
}
