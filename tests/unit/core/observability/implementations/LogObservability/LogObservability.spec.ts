import { LogObservability } from '@observability/implementations/LogObservability'
import { ObservabilityEvent, ObservabilityEventType, ObservabilitySpan } from '@observability'
import { GuardrailAction } from '@guardrail'

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

describe('LogObservability', () => {
    let logSpy: jest.SpyInstance

    beforeEach(() => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        logSpy.mockRestore()
    })

    function loggedLines(): Array<string> {
        return logSpy.mock.calls.map(call => String(call[0]))
    }

    it('creates a trace and logs a trace-start line', async () => {
        const observability = new LogObservability()

        const trace = await observability.startTrace('agent-1', 'session-1')

        expect(trace).toMatchObject({
            agentId: 'agent-1',
            sessionId: 'session-1',
            spans: [],
            totalTokens: 0,
            totalCostUsd: 0
        })
        expect(loggedLines().some(line => line.includes('Trace') && line.includes('agent-1'))).toBe(true)
    })

    it('does nothing when ending an unknown trace', async () => {
        const observability = new LogObservability()

        await expect(observability.endTrace('unknown-trace')).resolves.toBeUndefined()
        expect(logSpy).not.toHaveBeenCalled()
    })

    it('logs a trace-done line including accumulated tokens and cost', async () => {
        const observability = new LogObservability()
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

        const doneLine = loggedLines().find(line => line.includes('Trace done'))
        expect(doneLine).toBeDefined()
        expect(doneLine).toEqual(expect.stringContaining('tokens:15'))
        expect(doneLine).toEqual(expect.stringContaining('cost:$0.0200'))
    })

    it('records a span and includes it on the trace, indenting nested spans under their parent', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.startSpan(trace.id, span({ id: 'span-1', type: 'run' }))
        await observability.startSpan(trace.id, span({ id: 'span-2', type: 'tool-call', parentId: 'span-1' }))

        const stored = await observability.getTrace(trace.id)
        expect(stored?.spans.map(s => s.id)).toEqual(['span-1', 'span-2'])

        const lines = loggedLines()
        const rootLine = lines.find(line => line.includes('span:run'))
        const nestedLine = lines.find(line => line.includes('span:tool-call'))
        expect(rootLine).toBeDefined()
        expect(nestedLine).toBeDefined()
        expect(nestedLine?.length).toBeGreaterThan(rootLine?.length ?? 0)
    })

    it('does nothing when starting or ending a span on an unknown trace', async () => {
        const observability = new LogObservability()

        await expect(observability.startSpan('unknown-trace', span({ id: 's', type: 'run' }))).resolves.toBeUndefined()
        await expect(observability.endSpan('unknown-trace', 's')).resolves.toBeUndefined()
        expect(logSpy).not.toHaveBeenCalled()
    })

    it('does nothing when ending an unknown span on a known trace', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await expect(observability.endSpan(trace.id, 'unknown-span')).resolves.toBeUndefined()
        expect(logSpy).not.toHaveBeenCalled()
    })

    it.each`
        action     | expectedSymbol
        ${'allow'} | ${'✓'}
        ${'warn'}  | ${'⚠'}
        ${'block'} | ${'✗'}
    `(
        'formats a guardrail event with the symbol for action "$action"',
        async ({ action, expectedSymbol }: { action: GuardrailAction; expectedSymbol: string }) => {
            const observability = new LogObservability()
            const trace = await observability.startTrace('agent-1', 'session-1')
            logSpy.mockClear()

            await observability.recordEvent(
                trace.id,
                baseEvent({
                    type: 'guardrail-tool',
                    guardrailName: 'no-secrets',
                    toolName: 'RunShellCommand',
                    action,
                    reason: 'blocked reason'
                })
            )

            const line = loggedLines()[0]
            expect(line).toEqual(expect.stringContaining(expectedSymbol))
            expect(line).toEqual(expect.stringContaining('no-secrets'))
            expect(line).toEqual(expect.stringContaining('RunShellCommand'))
        }
    )

    it('formats a tool-result event differently for success and error', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'tool-result',
                toolResult: { id: 't1', name: 'Tool', output: 'ok', isError: false }
            })
        )
        const successLine = loggedLines()[0]
        expect(successLine).toEqual(expect.stringContaining('✓ tool-result'))

        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'tool-result',
                toolResult: { id: 't2', name: 'Tool', output: 'boom', isError: true }
            })
        )
        const errorLine = loggedLines()[0]
        expect(errorLine).toEqual(expect.stringContaining('✗ tool-result'))
    })

    it('formats an error event including the error message', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(trace.id, baseEvent({ type: 'error', error: 'something broke' }))

        expect(loggedLines()[0]).toEqual(expect.stringContaining('something broke'))
    })

    it('does nothing when recording an event for an unknown trace', async () => {
        const observability = new LogObservability()

        await expect(observability.recordEvent('unknown-trace', baseEvent({ type: 'done' }))).resolves.toBeUndefined()
        expect(logSpy).not.toHaveBeenCalled()
    })

    it('returns null from getTrace() for an unknown trace id', async () => {
        const observability = new LogObservability()

        await expect(observability.getTrace('unknown-trace')).resolves.toBeNull()
    })

    it('lists only traces belonging to the requested agent', async () => {
        const observability = new LogObservability()
        const traceA = await observability.startTrace('agent-a', 'session-1')
        await observability.startTrace('agent-b', 'session-2')

        const traces = await observability.listTraces('agent-a')

        expect(traces.map(t => t.id)).toEqual([traceA.id])
    })

    it('logs a trace-done line without tokens/cost suffixes when nothing was accumulated', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.endTrace(trace.id)

        const doneLine = loggedLines()[0]
        expect(doneLine).toEqual(expect.stringContaining('Trace done'))
        expect(doneLine).not.toEqual(expect.stringContaining('tokens:'))
        expect(doneLine).not.toEqual(expect.stringContaining('cost:'))
    })

    it('includes the tool name in the span label when metadata.toolName is a string', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.startSpan(
            trace.id,
            span({ id: 'span-1', type: 'tool-call', metadata: { toolName: 'search' } })
        )

        expect(loggedLines()[0]).toEqual(expect.stringContaining('search'))
    })

    it('serializes a non-string metadata.toolName as JSON in the span label', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.startSpan(
            trace.id,
            span({ id: 'span-1', type: 'tool-call', metadata: { toolName: { nested: true } } })
        )

        expect(loggedLines()[0]).toEqual(expect.stringContaining('{"nested":true}'))
    })

    it('closes a span, logging its duration and removing it from the active depths', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        await observability.startSpan(trace.id, span({ id: 'span-1', type: 'run' }))
        logSpy.mockClear()

        await observability.endSpan(trace.id, 'span-1')

        const line = loggedLines()[0]
        expect(line).toEqual(expect.stringContaining('span:run'))
        expect(line).toEqual(expect.stringContaining('└─'))
    })

    it('keeps a depth marked active when a sibling span at the same depth is still open', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        await observability.startSpan(trace.id, span({ id: 'root', type: 'run' }))
        await observability.startSpan(trace.id, span({ id: 'child-a', type: 'tool-call', parentId: 'root' }))
        await observability.startSpan(trace.id, span({ id: 'child-b', type: 'tool-call', parentId: 'root' }))
        logSpy.mockClear()

        await observability.endSpan(trace.id, 'child-a')
        await observability.startSpan(trace.id, span({ id: 'grandchild', type: 'guardrail-tool', parentId: 'child-b' }))

        const lines = loggedLines()
        const grandchildLine = lines.find(line => line.includes('span:guardrail-tool'))
        expect(grandchildLine).toEqual(expect.stringContaining('│'))
    })

    it('prints blank indentation for a depth level whose only span already closed', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        await observability.startSpan(trace.id, span({ id: 'root', type: 'run' }))
        await observability.startSpan(trace.id, span({ id: 'mid', type: 'tool-call', parentId: 'root' }))
        await observability.startSpan(trace.id, span({ id: 'leaf', type: 'guardrail-tool', parentId: 'mid' }))
        await observability.endSpan(trace.id, 'mid')
        logSpy.mockClear()

        await observability.startSpan(trace.id, span({ id: 'deep', type: 'guardrail-input', parentId: 'leaf' }))

        const deepLine = loggedLines().find(line => line.includes('span:guardrail-input'))
        expect(deepLine).toEqual(expect.stringContaining('   '))
    })

    it('falls back to depth 1 when a new span references an already-closed parent', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        await observability.startSpan(trace.id, span({ id: 'root', type: 'run' }))
        await observability.endSpan(trace.id, 'root')
        logSpy.mockClear()

        await observability.startSpan(trace.id, span({ id: 'orphan', type: 'tool-call', parentId: 'root' }))

        const orphanLine = loggedLines().find(line => line.includes('span:tool-call'))
        expect(orphanLine).not.toEqual(expect.stringContaining('│'))
    })

    it('records events at increasing depth while a span is open', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        await observability.startSpan(trace.id, span({ id: 'span-1', type: 'run' }))
        logSpy.mockClear()

        await observability.recordEvent(trace.id, baseEvent({ type: 'done' }))

        expect(loggedLines()[0]).toEqual(expect.stringContaining('done'))
    })

    it.each`
        eventType              | overrides                           | expectedText
        ${'session-optimized'} | ${{}}                               | ${'session-optimized'}
        ${'tool-pool-built'}   | ${{ toolCount: 3 }}                 | ${'tools:3'}
        ${'thinking'}          | ${{ thinking: 'pondering deeply' }} | ${'pondering deeply'}
        ${'message'}           | ${{ message: 'final reply' }}       | ${'final reply'}
        ${'done'}              | ${{}}                               | ${'done'}
    `(
        'formats a "$eventType" event',
        async ({
            eventType,
            overrides,
            expectedText
        }: {
            eventType: ObservabilityEventType
            overrides: Partial<ObservabilityEvent>
            expectedText: string
        }) => {
            const observability = new LogObservability()
            const trace = await observability.startTrace('agent-1', 'session-1')
            logSpy.mockClear()

            await observability.recordEvent(trace.id, baseEvent({ type: eventType, ...overrides }))

            expect(loggedLines()[0]).toEqual(expect.stringContaining(expectedText))
        }
    )

    it('formats a tool-call event with the tool name', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'tool-call', toolCall: { id: 'c1', name: 'search', arguments: {} } })
        )

        expect(loggedLines()[0]).toEqual(expect.stringContaining('tool-call'))
        expect(loggedLines()[0]).toEqual(expect.stringContaining('search'))
    })

    it('formats guardrail-input and guardrail-output events with the correct label and no tool suffix', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'guardrail-input', guardrailName: 'no-secrets', action: 'allow' })
        )
        expect(loggedLines()[0]).toEqual(expect.stringContaining('guardrail-input'))

        logSpy.mockClear()
        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'guardrail-output', guardrailName: 'no-secrets', action: 'allow' })
        )
        expect(loggedLines()[0]).toEqual(expect.stringContaining('guardrail-output'))
    })

    it('omits the reason suffix from a guardrail event when no reason is given', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({ type: 'guardrail-input', guardrailName: 'no-secrets', action: 'allow' })
        )

        expect(loggedLines()[0]).not.toEqual(expect.stringContaining('"'))
    })

    it('formats an iteration event without usage, budgetState or cost suffixes', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(trace.id, baseEvent({ type: 'iteration' }))

        const line = loggedLines()[0]
        expect(line).toEqual(expect.stringContaining('iteration'))
        expect(line).not.toEqual(expect.stringContaining('tokens:'))
        expect(line).not.toEqual(expect.stringContaining('cost:'))
        expect(line).not.toEqual(expect.stringContaining('iter:'))
    })

    it('formats an iteration event with budgetState but no usage, omitting the tokens suffix', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'iteration',
                budgetState: { usedTokens: 0, usedIterations: 1, usedToolCalls: 0, usedCostUsd: 0, elapsedMs: 5 }
            })
        )

        const line = loggedLines()[0]
        expect(line).not.toEqual(expect.stringContaining('tokens:'))
        expect(line).toEqual(expect.stringContaining('iter:1'))
    })

    it('omits the cost suffix on a second iteration when cost did not increase', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'iteration',
                budgetState: { usedTokens: 5, usedIterations: 1, usedToolCalls: 0, usedCostUsd: 0.01, elapsedMs: 5 }
            })
        )
        logSpy.mockClear()

        await observability.recordEvent(
            trace.id,
            baseEvent({
                type: 'iteration',
                budgetState: { usedTokens: 5, usedIterations: 2, usedToolCalls: 0, usedCostUsd: 0.01, elapsedMs: 10 }
            })
        )

        expect(loggedLines()[0]).not.toEqual(expect.stringContaining('cost:'))
    })

    it('formats a trace-done duration in seconds once it reaches 1000ms', async () => {
        const observability = new LogObservability()
        const nowSpy = jest.spyOn(Date, 'now')

        try {
            nowSpy.mockReturnValueOnce(1_000_000)
            const trace = await observability.startTrace('agent-1', 'session-1')
            logSpy.mockClear()

            nowSpy.mockReturnValueOnce(1_002_500)
            await observability.endTrace(trace.id)

            expect(loggedLines()[0]).toEqual(expect.stringContaining('2.5s'))
        } finally {
            nowSpy.mockRestore()
        }
    })

    it('truncates a long message preview with an ellipsis', async () => {
        const observability = new LogObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')
        logSpy.mockClear()

        const longMessage = 'x'.repeat(80)
        await observability.recordEvent(trace.id, baseEvent({ type: 'message', message: longMessage }))

        const line = loggedLines()[0]
        expect(line).toEqual(expect.stringContaining('...'))
        expect(line).not.toEqual(expect.stringContaining(longMessage))
    })
})
