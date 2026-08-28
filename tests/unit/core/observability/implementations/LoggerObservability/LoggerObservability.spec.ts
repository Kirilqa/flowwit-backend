import { LoggerObservability } from '@observability/implementations/LoggerObservability'
import { ObservabilityEvent, ObservabilityEventType, ObservabilitySpan } from '@observability'
import { makeLoggerMock } from '../../../../../helpers/makeLogger'

function baseEvent(overrides: Partial<ObservabilityEvent> & Pick<ObservabilityEvent, 'type'>): ObservabilityEvent {
    return {
        id: 'event-1',
        agentId: 'agent-1',
        sessionId: 'session-1',
        createdAt: Date.now(),
        ...overrides
    } as ObservabilityEvent
}

function span(overrides: Partial<ObservabilitySpan> & Pick<ObservabilitySpan, 'id' | 'type'>): ObservabilitySpan {
    return { startedAt: Date.now(), ...overrides }
}

describe('LoggerObservability', () => {
    it('scopes its logger under "observability"', () => {
        const logger = makeLoggerMock()

        new LoggerObservability(logger)

        expect(logger.child).toHaveBeenCalledWith('observability')
    })

    it('creates a trace and logs its start at info level', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)

        const trace = await observability.startTrace('agent-1', 'session-1')

        expect(trace).toMatchObject({
            agentId: 'agent-1',
            sessionId: 'session-1',
            spans: [],
            totalTokens: 0,
            totalCostUsd: 0
        })
        expect(logger.info).toHaveBeenCalledWith(
            'Trace started',
            expect.objectContaining({ traceId: trace.id, agentId: 'agent-1', sessionId: 'session-1' })
        )
    })

    it('does nothing when ending an unknown trace', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)

        await expect(observability.endTrace('unknown-trace')).resolves.toBeUndefined()
        expect(logger.info).not.toHaveBeenCalled()
    })

    it('logs trace end at info level with accumulated tokens and cost', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'iteration',
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
                budgetState: {
                    usedTokens: 15,
                    usedIterations: 1,
                    usedToolCalls: 0,
                    usedCostUsd: 0.02,
                    elapsedMs: 100
                }
            })
        )
        await observability.endTrace(trace.id)

        expect(logger.info).toHaveBeenCalledWith(
            'Trace ended',
            expect.objectContaining({ traceId: trace.id, totalTokens: 15, totalCostUsd: 0.02 })
        )
    })

    it('records a span on the trace and logs its start/end at debug level', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.startSpan(trace.id, span({ id: 'span-1', type: 'run' }))
        expect(logger.debug).toHaveBeenCalledWith(
            'Span started',
            expect.objectContaining({ traceId: trace.id, spanId: 'span-1', spanType: 'run' })
        )

        const stored = await observability.getTrace(trace.id)
        expect(stored?.spans.map(s => s.id)).toEqual(['span-1'])

        await observability.endSpan(trace.id, 'span-1')
        expect(logger.debug).toHaveBeenCalledWith(
            'Span ended',
            expect.objectContaining({ traceId: trace.id, spanId: 'span-1', spanType: 'run' })
        )
    })

    it('does nothing when starting or ending a span on an unknown trace', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)

        await expect(observability.startSpan('unknown-trace', span({ id: 's', type: 'run' }))).resolves.toBeUndefined()
        await expect(observability.endSpan('unknown-trace', 's')).resolves.toBeUndefined()
        expect(logger.debug).not.toHaveBeenCalled()
    })

    it('does nothing when ending an unknown span on a known trace', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await expect(observability.endSpan(trace.id, 'unknown-span')).resolves.toBeUndefined()
        expect(logger.debug).not.toHaveBeenCalled()
    })

    it('logs allowed guardrail events at debug level and non-allowed ones at warn level', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'guardrail-tool',
                guardrailName: 'no-secrets',
                toolName: 'RunShellCommand',
                action: 'allow'
            })
        )
        expect(logger.debug).toHaveBeenCalledWith(
            'Guardrail: guardrail-tool',
            expect.objectContaining({ guardrailName: 'no-secrets', action: 'allow', toolName: 'RunShellCommand' })
        )

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'guardrail-tool',
                guardrailName: 'no-secrets',
                toolName: 'RunShellCommand',
                action: 'block',
                reason: 'contains a secret'
            })
        )
        expect(logger.warn).toHaveBeenCalledWith(
            'Guardrail: guardrail-tool',
            expect.objectContaining({ action: 'block', reason: 'contains a secret' })
        )
    })

    it('logs guardrail-input and guardrail-output events without a toolName', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'guardrail-input', guardrailName: 'no-secrets', action: 'allow' })
        )
        expect(logger.debug).toHaveBeenCalledWith('Guardrail: guardrail-input', expect.anything())
        const inputCall = (logger.debug as jest.Mock).mock.calls[0] as [string, Record<string, unknown>]
        expect(inputCall[1]).not.toHaveProperty('toolName')

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'guardrail-output', guardrailName: 'no-secrets', action: 'allow' })
        )
        expect(logger.debug).toHaveBeenCalledWith('Guardrail: guardrail-output', expect.anything())
    })

    it('logs a failing tool-result at warn level and a succeeding one at debug level', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'tool-result', toolResult: { id: 't1', name: 'Tool', output: 'ok', isError: false } })
        )
        expect(logger.debug).toHaveBeenCalledWith('Tool result', expect.anything())

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'tool-result', toolResult: { id: 't2', name: 'Tool', output: 'boom', isError: true } })
        )
        expect(logger.warn).toHaveBeenCalledWith('Tool result', expect.anything())
    })

    it('logs an error event at error level with the error message', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(trace.id, baseEvent({ type: 'error', error: 'something broke' }))

        expect(logger.error).toHaveBeenCalledWith('Error', expect.objectContaining({ error: 'something broke' }))
    })

    it('does nothing when recording an event for an unknown trace', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)

        await expect(observability.recordEvent('unknown-trace', baseEvent({ type: 'done' }))).resolves.toBeUndefined()
        expect(logger.debug).not.toHaveBeenCalled()
    })

    it('returns null from getTrace() for an unknown trace id', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)

        await expect(observability.getTrace('unknown-trace')).resolves.toBeNull()
    })

    it('lists only traces belonging to the requested agent', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const traceA = await observability.startTrace('agent-a', 'session-1')
        await observability.startTrace('agent-b', 'session-2')

        const traces = await observability.listTraces('agent-a')

        expect(traces.map(t => t.id)).toEqual([traceA.id])
    })

    it('includes parentSpanId and metadata in the "Span started" log when provided', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.startSpan(
            trace.id,
            span({ id: 'span-1', type: 'tool-call', parentId: 'parent-span', metadata: { toolName: 'search' } })
        )

        expect(logger.debug).toHaveBeenCalledWith(
            'Span started',
            expect.objectContaining({ parentSpanId: 'parent-span', metadata: { toolName: 'search' } })
        )
    })

    it('omits parentSpanId and metadata from the "Span started" log when absent', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.startSpan(trace.id, span({ id: 'span-1', type: 'run' }))

        const call = (logger.debug as jest.Mock).mock.calls[0] as [string, Record<string, unknown>]
        expect(call[1]).not.toHaveProperty('parentSpanId')
        expect(call[1]).not.toHaveProperty('metadata')
    })

    it('does not update trace metrics for a non-iteration event', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(trace.id, baseEvent({ type: 'done' }))
        const stored = await observability.getTrace(trace.id)

        expect(stored?.totalTokens).toBe(0)
        expect(stored?.totalCostUsd).toBe(0)
    })

    it('does not update trace metrics for an iteration event without budgetState', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(trace.id, baseEvent({ type: 'iteration' }))
        const stored = await observability.getTrace(trace.id)

        expect(stored?.totalTokens).toBe(0)
        expect(stored?.totalCostUsd).toBe(0)
    })

    it('updates cost but not tokens for an iteration event with budgetState but no usage', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'iteration',
                budgetState: { usedTokens: 5, usedIterations: 1, usedToolCalls: 0, usedCostUsd: 0.03, elapsedMs: 5 }
            })
        )
        const stored = await observability.getTrace(trace.id)

        expect(stored?.totalTokens).toBe(0)
        expect(stored?.totalCostUsd).toBe(0.03)
    })

    it.each`
        eventType              | overrides                     | expectedMessage
        ${'session-optimized'} | ${{}}                         | ${'Session optimized'}
        ${'tool-pool-built'}   | ${{ toolCount: 4 }}           | ${'Tool pool built'}
        ${'thinking'}          | ${{ thinking: 'pondering' }}  | ${'Thinking'}
        ${'message'}           | ${{ message: 'final reply' }} | ${'Message'}
        ${'done'}              | ${{}}                         | ${'Done'}
    `(
        'logs a "$eventType" event as "$expectedMessage" at debug level',
        async ({
            eventType,
            overrides,
            expectedMessage
        }: {
            eventType: ObservabilityEventType
            overrides: Partial<ObservabilityEvent>
            expectedMessage: string
        }) => {
            const logger = makeLoggerMock()
            const observability = new LoggerObservability(logger)
            const trace = await observability.startTrace('agent-1', 'session-1')

            await observability.recordEvent(trace.id, baseEvent({ type: eventType, ...overrides }))

            expect(logger.debug).toHaveBeenCalledWith(expectedMessage, expect.anything())
        }
    )

    it('logs a tool-call event with the tool call payload at debug level', async () => {
        const logger = makeLoggerMock()
        const observability = new LoggerObservability(logger)
        const trace = await observability.startTrace('agent-1', 'session-1')

        const toolCall = { id: 'c1', name: 'search', arguments: {} }
        await observability.recordEvent(trace.id, baseEvent({ type: 'tool-call', toolCall }))

        expect(logger.debug).toHaveBeenCalledWith('Tool call', expect.objectContaining({ toolCall }))
    })
})
