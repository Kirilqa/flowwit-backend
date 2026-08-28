import { ObservabilityEvent, ObservabilitySpan, ObservabilityTrace } from '../types'

export interface ObservabilityInterface {
    startTrace(agentId: string, sessionId: string): Promise<ObservabilityTrace>
    endTrace(traceId: string): Promise<void>

    startSpan(traceId: string, span: ObservabilitySpan): Promise<void>
    endSpan(traceId: string, spanId: string): Promise<void>

    recordEvent(traceId: string, event: ObservabilityEvent): Promise<void>

    getTrace(traceId: string): Promise<ObservabilityTrace | null>
    listTraces(agentId: string): Promise<Array<ObservabilityTrace>>
}
