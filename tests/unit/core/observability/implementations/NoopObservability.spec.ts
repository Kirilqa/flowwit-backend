import { NoopObservability } from '@observability/implementations/NoopObservability'
import { ObservabilityInterface } from '@observability'

describe('NoopObservability', () => {
    it('creates a real trace object from startTrace()', async () => {
        const observability: ObservabilityInterface = new NoopObservability()

        const trace = await observability.startTrace('agent-1', 'session-1')

        expect(trace).toMatchObject({
            agentId: 'agent-1',
            sessionId: 'session-1',
            spans: [],
            totalTokens: 0,
            totalCostUsd: 0
        })
        expect(typeof trace.id).toBe('string')
        expect(trace.id.length).toBeGreaterThan(0)
        expect(typeof trace.startedAt).toBe('number')
    })

    it('does not persist any state across calls', async () => {
        const observability: ObservabilityInterface = new NoopObservability()

        const trace = await observability.startTrace('agent-1', 'session-1')

        await expect(observability.endTrace(trace.id)).resolves.toBeUndefined()
        await expect(
            observability.startSpan(trace.id, {
                id: 'span-1',
                type: 'run',
                startedAt: Date.now()
            })
        ).resolves.toBeUndefined()
        await expect(observability.endSpan(trace.id, 'span-1')).resolves.toBeUndefined()
        await expect(
            observability.recordEvent(trace.id, {
                id: 'event-1',
                agentId: 'agent-1',
                sessionId: 'session-1',
                createdAt: Date.now(),
                type: 'done'
            })
        ).resolves.toBeUndefined()
    })

    it('always returns null from getTrace()', async () => {
        const observability: ObservabilityInterface = new NoopObservability()
        const trace = await observability.startTrace('agent-1', 'session-1')

        await expect(observability.getTrace(trace.id)).resolves.toBeNull()
    })

    it('always returns an empty array from listTraces()', async () => {
        const observability: ObservabilityInterface = new NoopObservability()
        await observability.startTrace('agent-1', 'session-1')

        await expect(observability.listTraces('agent-1')).resolves.toEqual([])
    })
})
