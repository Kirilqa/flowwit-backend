import { randomUUID } from 'crypto'
import { ObservabilityInterface } from '../../interfaces'
import {
    OBSERVABILITY_EVENT_TYPE,
    ObservabilityEvent,
    ObservabilitySpan,
    ObservabilitySpanType,
    ObservabilityTrace
} from '../../types'
import { TraceMeta } from './types'

const ANSI = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    gray: '\x1b[90m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[97m'
} as const

const CONTENT_PREVIEW_LENGTH = 50

export class LogObservability implements ObservabilityInterface {
    private readonly traces = new Map<string, TraceMeta>()

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
            activeDepths: new Set(),
            lastIterationCostUsd: 0,
            startedAt: trace.startedAt
        })

        this.log(
            0,
            `${ANSI.bold}${ANSI.white}◆ Trace${ANSI.reset} ${ANSI.cyan}${agentId}${ANSI.reset} ${ANSI.gray}session:${sessionId}${ANSI.reset}`,
            new Set(),
            false
        )

        return trace
    }

    async endTrace(traceId: string): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        const durationMs = Date.now() - meta.startedAt
        const { trace } = meta

        const tokensSuffix = trace.totalTokens > 0 ? ` ${ANSI.cyan}tokens:${trace.totalTokens}${ANSI.reset}` : ''

        const costSuffix =
            trace.totalCostUsd > 0 ? ` ${ANSI.cyan}cost:$${trace.totalCostUsd.toFixed(4)}${ANSI.reset}` : ''

        this.log(
            0,
            `${ANSI.bold}${ANSI.white}◆ Trace done${ANSI.reset}${tokensSuffix}${costSuffix} ${ANSI.gray}${this.formatDuration(durationMs)}${ANSI.reset}`,
            new Set(),
            false
        )
    }

    async startSpan(traceId: string, span: ObservabilitySpan): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        const depth = this.resolveDepth(span, meta)

        meta.spanMeta.set(span.id, {
            depth,
            startedAt: span.startedAt,
            type: span.type,
            parentId: span.parentId
        })

        meta.activeDepths.add(depth)

        meta.trace.spans.push(span)

        const label = this.formatSpanLabel(span.type)
        const toolName = span.metadata?.['toolName']
        const nameSuffix =
            toolName !== undefined
                ? ` ${ANSI.gray}${typeof toolName === 'string' ? toolName : JSON.stringify(toolName)}${ANSI.reset}`
                : ''

        this.log(depth, `${ANSI.blue}▶ ${label}${ANSI.reset}${nameSuffix}`, meta.activeDepths, false)
    }

    async endSpan(traceId: string, spanId: string): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        const spanMeta = meta.spanMeta.get(spanId)

        if (!spanMeta) return

        const durationMs = Date.now() - spanMeta.startedAt
        const label = this.formatSpanLabel(spanMeta.type)

        meta.spanMeta.delete(spanId)

        const depthStillActive = Array.from(meta.spanMeta.values()).some(s => s.depth === spanMeta.depth)

        this.log(
            spanMeta.depth,
            `${ANSI.dim}${ANSI.blue}■ ${label}${ANSI.reset} ${ANSI.gray}${this.formatDuration(durationMs)}${ANSI.reset}`,
            meta.activeDepths,
            true
        )

        if (!depthStillActive) {
            meta.activeDepths.delete(spanMeta.depth)
        }
    }

    async recordEvent(traceId: string, event: ObservabilityEvent): Promise<void> {
        const meta = this.traces.get(traceId)

        if (!meta) return

        this.updateTraceMetrics(meta, event)

        const depth = this.resolveEventDepth(meta)
        const line = this.formatEvent(event, meta)

        this.log(depth, line, meta.activeDepths, false)
    }

    async getTrace(traceId: string): Promise<ObservabilityTrace | null> {
        return this.traces.get(traceId)?.trace ?? null
    }

    async listTraces(agentId: string): Promise<Array<ObservabilityTrace>> {
        return Array.from(this.traces.values())
            .map(m => m.trace)
            .filter(t => t.agentId === agentId)
    }

    private resolveDepth(span: ObservabilitySpan, meta: TraceMeta): number {
        if (span.parentId === undefined) return 1

        const parentMeta = meta.spanMeta.get(span.parentId)

        return parentMeta !== undefined ? parentMeta.depth + 1 : 1
    }

    private resolveEventDepth(meta: TraceMeta): number {
        const openSpans = Array.from(meta.spanMeta.values())

        if (openSpans.length === 0) return 1

        const maxDepth = Math.max(...openSpans.map(s => s.depth))

        return maxDepth + 1
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

    private formatEvent(event: ObservabilityEvent, meta: TraceMeta): string {
        switch (event.type) {
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_INPUT:
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_OUTPUT:
            case OBSERVABILITY_EVENT_TYPE.GUARDRAIL_TOOL: {
                const actionColor =
                    event.action === 'allow' ? ANSI.green : event.action === 'warn' ? ANSI.yellow : ANSI.red

                const actionSymbol = event.action === 'allow' ? '✓' : event.action === 'warn' ? '⚠' : '✗'

                const label =
                    event.type === OBSERVABILITY_EVENT_TYPE.GUARDRAIL_INPUT
                        ? 'guardrail-input'
                        : event.type === OBSERVABILITY_EVENT_TYPE.GUARDRAIL_OUTPUT
                          ? 'guardrail-output'
                          : 'guardrail-tool'

                const guardrailNameSuffix = ` ${ANSI.gray}${event.guardrailName}${ANSI.reset}`

                const toolSuffix =
                    event.type === OBSERVABILITY_EVENT_TYPE.GUARDRAIL_TOOL
                        ? ` ${ANSI.gray}${event.toolName}${ANSI.reset}`
                        : ''

                const reasonSuffix =
                    'reason' in event ? ` ${ANSI.gray}"${this.preview(event.reason)}"${ANSI.reset}` : ''

                return `${actionColor}${actionSymbol} ${label}${ANSI.reset}${guardrailNameSuffix}${toolSuffix} ${actionColor}${event.action}${ANSI.reset}${reasonSuffix}`
            }

            case OBSERVABILITY_EVENT_TYPE.SESSION_OPTIMIZED:
                return `${ANSI.green}✓ session-optimized${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.TOOL_POOL_BUILT:
                return `${ANSI.green}✓ tool-pool-built${ANSI.reset} ${ANSI.cyan}tools:${event.toolCount}${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.THINKING:
                return `${ANSI.green}✓ thinking${ANSI.reset} ${ANSI.gray}"${this.preview(event.thinking)}"${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.MESSAGE:
                return `${ANSI.green}✓ message${ANSI.reset} ${ANSI.gray}"${this.preview(event.message)}"${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.TOOL_CALL:
                return `${ANSI.green}✓ tool-call${ANSI.reset} ${ANSI.cyan}${event.toolCall.name}${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.TOOL_RESULT:
                return event.toolResult.isError
                    ? `${ANSI.red}✗ tool-result${ANSI.reset} ${ANSI.gray}"${this.preview(String(event.toolResult.output))}"${ANSI.reset}`
                    : `${ANSI.green}✓ tool-result${ANSI.reset} ${ANSI.gray}"${this.preview(String(event.toolResult.output))}"${ANSI.reset}`

            case OBSERVABILITY_EVENT_TYPE.ITERATION: {
                const tokensSuffix =
                    event.usage !== undefined ? ` ${ANSI.cyan}tokens:${event.usage.totalTokens}${ANSI.reset}` : ''

                const iterationCost =
                    event.budgetState !== undefined ? event.budgetState.usedCostUsd - meta.lastIterationCostUsd : 0

                const costSuffix =
                    iterationCost > 0 ? ` ${ANSI.cyan}cost:$${iterationCost.toFixed(4)}${ANSI.reset}` : ''

                const iterSuffix =
                    event.budgetState !== undefined
                        ? ` ${ANSI.gray}iter:${event.budgetState.usedIterations}${ANSI.reset}`
                        : ''

                if (event.budgetState !== undefined) {
                    meta.lastIterationCostUsd = event.budgetState.usedCostUsd
                }

                return `${ANSI.green}✓ iteration${ANSI.reset}${tokensSuffix}${costSuffix}${iterSuffix}`
            }

            case OBSERVABILITY_EVENT_TYPE.DONE: {
                return `${ANSI.green}✓ done${ANSI.reset}`
            }

            case OBSERVABILITY_EVENT_TYPE.ERROR:
                return `${ANSI.red}✗ error${ANSI.reset} ${ANSI.gray}"${event.error}"${ANSI.reset}`
        }
    }

    private formatSpanLabel(type: ObservabilitySpanType): string {
        return `span:${type}`
    }

    private formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`

        return `${(ms / 1000).toFixed(1)}s`
    }

    private preview(text: string, length: number = CONTENT_PREVIEW_LENGTH): string {
        const cleaned = text.replace(/\n/g, ' ')

        if (length <= 0) return cleaned

        if (cleaned.length <= length) return cleaned

        return `${cleaned.slice(0, length)}...`
    }

    private log(depth: number, message: string, activeDepths: Set<number>, isClosing: boolean): void {
        const indent = this.buildIndent(depth, activeDepths, isClosing)

        console.log(`${indent}${message}`)
    }

    private buildIndent(depth: number, activeDepths: Set<number>, isClosing: boolean): string {
        if (depth === 0) return ''

        let result = ''

        for (let i = 1; i < depth; i++) {
            result += activeDepths.has(i) ? `${ANSI.gray}│  ${ANSI.reset}` : '   '
        }

        result += isClosing ? `${ANSI.gray}└─ ${ANSI.reset}` : `${ANSI.gray}├─ ${ANSI.reset}`

        return result
    }
}
