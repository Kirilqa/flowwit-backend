import { randomUUID } from 'crypto'
import { LoggerInterface } from '@logger'
import { GUARDRAIL_ACTION } from '@guardrail'
import { ObservabilityInterface } from '../../interfaces'
import { OBSERVABILITY_EVENT_TYPE, ObservabilityEvent, ObservabilitySpan, ObservabilityTrace } from '../../types'
import { TraceMeta } from './types'

export class LoggerObservability implements ObservabilityInterface {
    private readonly logger: LoggerInterface
    private readonly traces = new Map<string, TraceMeta>()

    constructor(logger: LoggerInterface) {
        this.logger = logger.child('observability')
    }

    async startTrace(agentId: string, sessionId: string): Promise<ObservabilityTrace> {
        const trace: ObservabilityTrace = {
            id: randomUUID(),
            agentId,
            sessionId,
            startedAt: Date.now(),
            spans: [],
            totalTokens: 0,
            totalCostUsd: 0
        }

        this.traces.set(trace.id, {
            trace,
            spanMeta: new Map(),
            lastIterationCostUsd: 0
        })

        this.logger.info('Trace started', { traceId: trace.id, agentId, sessionId })

        return trace
    }

    async endTrace(traceId: string): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        const durationMs = Date.now() - meta.trace.startedAt

        this.logger.info('Trace ended', {
            traceId,
            durationMs,
            totalTokens: meta.trace.totalTokens,
            totalCostUsd: meta.trace.totalCostUsd
        })
    }

    async startSpan(traceId: string, span: ObservabilitySpan): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        meta.spanMeta.set(span.id, {
            type: span.type,
            startedAt: span.startedAt,
            ...(span.parentId !== undefined && { parentId: span.parentId })
        })

        meta.trace.spans.push(span)

        this.logger.debug('Span started', {
            traceId,
            spanId: span.id,
            spanType: span.type,
            ...(span.parentId !== undefined && { parentSpanId: span.parentId }),
            ...(span.metadata !== undefined && { metadata: span.metadata })
        })
    }

    async endSpan(traceId: string, spanId: string): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        const spanMeta = meta.spanMeta.get(spanId)

        if (!spanMeta) return

        const durationMs = Date.now() - spanMeta.startedAt

        meta.spanMeta.delete(spanId)

        this.logger.debug('Span ended', { traceId, spanId, spanType: spanMeta.type, durationMs })
    }

    async recordEvent(traceId: string, event: ObservabilityEvent): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        this.updateTraceMetrics(meta, event)

        const { message, data, level } = this.describeEvent(event)

        this.logger[level](message, { traceId, eventId: event.id, ...data })
    }

    async getTrace(traceId: string): Promise<ObservabilityTrace | null> {
        return this.traces.get(traceId)?.trace ?? null
    }

    async listTraces(agentId: string): Promise<Array<ObservabilityTrace>> {
        return Array.from(this.traces.values())
            .map(m => m.trace)
            .filter(t => t.agentId === agentId)
    }

    private updateTraceMetrics(meta: TraceMeta, event: ObservabilityEvent): void {
        if (event.type !== OBSERVABILITY_EVENT_TYPE.ITERATION) return

        if (event.budgetState !== undefined) {
            if (event.usage !== undefined) {
                meta.trace.totalTokens = event.budgetState.usedTokens
            }

            meta.trace.totalCostUsd = event.budgetState.usedCostUsd
        }
    }

    private describeEvent(event: ObservabilityEvent): {
        message: string
        data: Record<string, unknown>
        level: 'debug' | 'warn' | 'error'
    } {
        switch (event.type) {
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_INPUT:
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_OUTPUT:
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_TOOL: {
                const level = event.action === GUARDRAIL_ACTION.ALLOW ? 'debug' : 'warn'

                return {
                    message: `Guardrail: ${event.type}`,
                    level,
                    data: {
                        guardrailName: event.guardrailName,
                        action: event.action,
                        ...('toolName' in event && { toolName: event.toolName }),
                        ...(event.reason !== undefined && { reason: event.reason })
                    }
                }
            }

            case OBSERVABILITY_EVENT_TYPE.SESSION_OPTIMIZED:
                return { message: 'Session optimized', level: 'debug', data: {} }

            case OBSERVABILITY_EVENT_TYPE.TOOL_POOL_BUILT:
                return { message: 'Tool pool built', level: 'debug', data: { toolCount: event.toolCount } }

            case OBSERVABILITY_EVENT_TYPE.THINKING:
                return { message: 'Thinking', level: 'debug', data: { thinking: event.thinking } }

            case OBSERVABILITY_EVENT_TYPE.MESSAGE:
                return { message: 'Message', level: 'debug', data: { message: event.message } }

            case OBSERVABILITY_EVENT_TYPE.TOOL_CALL:
                return { message: 'Tool call', level: 'debug', data: { toolCall: event.toolCall } }

            case OBSERVABILITY_EVENT_TYPE.TOOL_RESULT:
                return {
                    message: 'Tool result',
                    level: event.toolResult.isError ? 'warn' : 'debug',
                    data: { toolResult: event.toolResult }
                }

            case OBSERVABILITY_EVENT_TYPE.ITERATION:
                return {
                    message: 'Iteration',
                    level: 'debug',
                    data: {
                        ...(event.usage !== undefined && { usage: event.usage }),
                        ...(event.budgetState !== undefined && { budgetState: event.budgetState })
                    }
                }

            case OBSERVABILITY_EVENT_TYPE.DONE:
                return { message: 'Done', level: 'debug', data: {} }

            case OBSERVABILITY_EVENT_TYPE.ERROR:
                return { message: 'Error', level: 'error', data: { error: event.error } }
        }
    }
}
