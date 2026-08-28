import {
    GuardrailResolverAggregator,
    GUARDRAIL_ACTION,
    GUARDRAIL_REQUEST_DECISION,
    GuardrailEvent,
    GuardrailCheckResult
} from '@guardrail'
import { ToolPermissionGuardrail } from '@guardrail/implementations/guardrail/ToolPermissionGuardrail'
import { ToolCall, ToolInterface } from '@tool'
import { makeNoopRulesStore, makeRulesStoreWithRule } from '../../../../../helpers/makeGuardrailRulesStore'

function makeDefaultTools(...names: Array<string>): Array<ToolInterface> {
    return names.map(name => ({
        name,
        description: '',
        parameters: {},
        execute: jest.fn()
    }))
}

async function runCheckToolCallWithDecision(
    guardrail: ToolPermissionGuardrail,
    toolCall: ToolCall,
    sessionId: string,
    decision: (typeof GUARDRAIL_REQUEST_DECISION)[keyof typeof GUARDRAIL_REQUEST_DECISION]
): Promise<{ events: Array<GuardrailEvent>; result: GuardrailCheckResult }> {
    const gen = guardrail.checkToolCall(toolCall, sessionId)
    const events: Array<GuardrailEvent> = []

    const firstStep = await gen.next()
    if (firstStep.done) return { events, result: firstStep.value }
    events.push(firstStep.value)

    const [secondStep] = await Promise.all([
        gen.next(),
        Promise.resolve().then(() => {
            guardrail.resolve(firstStep.value.requestId, decision)
        })
    ])

    if (secondStep.done) return { events, result: secondStep.value }

    return { events, result: { action: GUARDRAIL_ACTION.ALLOW } }
}

function makeToolCall(name = 'my_tool'): ToolCall {
    return { id: 'call-1', name, arguments: {} }
}

describe('ToolPermissionGuardrail', () => {
    let guardrail: ToolPermissionGuardrail

    beforeEach(() => {
        guardrail = new ToolPermissionGuardrail(makeNoopRulesStore(), makeDefaultTools('done'))
    })

    describe('checkInput()', () => {
        it('always returns ALLOW', async () => {
            const gen = guardrail.checkInput('some input', 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })
    })

    describe('checkOutput()', () => {
        it('always returns ALLOW', async () => {
            const gen = guardrail.checkOutput('some output', 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })
    })

    describe('checkToolCall()', () => {
        it('skips "done" tool without asking', async () => {
            const gen = guardrail.checkToolCall(makeToolCall('done'), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('yields a guardrail event with a requestId before waiting for decision', async () => {
            const gen = guardrail.checkToolCall(makeToolCall(), 'session-1')
            const firstStep = await gen.next()
            if (firstStep.done) throw new Error('Expected generator to yield')
            expect(firstStep.value.requestId).toBeDefined()
            guardrail.resolve(firstStep.value.requestId, GUARDRAIL_REQUEST_DECISION.APPROVE)
        })

        it('returns ALLOW when decision is APPROVE', async () => {
            const { events, result } = await runCheckToolCallWithDecision(
                guardrail,
                makeToolCall('tool_approve'),
                'session-1',
                GUARDRAIL_REQUEST_DECISION.APPROVE
            )
            expect(events).toHaveLength(1)
            expect(result.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('returns BLOCK when decision is DENY', async () => {
            const { result } = await runCheckToolCallWithDecision(
                guardrail,
                makeToolCall('tool_deny'),
                'session-1',
                GUARDRAIL_REQUEST_DECISION.DENY
            )
            expect(result.action).toBe(GUARDRAIL_ACTION.BLOCK)
        })

        it('returns BLOCK when decision is ABORTED', async () => {
            const { result } = await runCheckToolCallWithDecision(
                guardrail,
                makeToolCall('tool_aborted'),
                'session-1',
                GUARDRAIL_REQUEST_DECISION.ABORTED
            )
            expect(result.action).toBe(GUARDRAIL_ACTION.BLOCK)
        })

        it('saves session rule on APPROVE_ALWAYS via rulesStore', async () => {
            const store = makeNoopRulesStore()
            const g = new ToolPermissionGuardrail(store, makeDefaultTools('done'))
            await runCheckToolCallWithDecision(
                g,
                makeToolCall('my_tool'),
                'session-1',
                GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS
            )
            expect(store.setSessionRule).toHaveBeenCalledWith(
                'tool_permission',
                'my_tool',
                'session-1',
                GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS
            )
        })

        it('saves session rule on DENY_ALWAYS via rulesStore', async () => {
            const store = makeNoopRulesStore()
            const g = new ToolPermissionGuardrail(store, makeDefaultTools('done'))
            await runCheckToolCallWithDecision(
                g,
                makeToolCall('my_tool'),
                'session-1',
                GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS
            )
            expect(store.setSessionRule).toHaveBeenCalledWith(
                'tool_permission',
                'my_tool',
                'session-1',
                GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS
            )
        })

        it('skips the request when rulesStore has approve_always rule', async () => {
            const g = new ToolPermissionGuardrail(
                makeRulesStoreWithRule(GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS),
                makeDefaultTools('done')
            )
            const gen = g.checkToolCall(makeToolCall('my_tool'), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('blocks without asking when rulesStore has deny_always rule', async () => {
            const g = new ToolPermissionGuardrail(
                makeRulesStoreWithRule(GUARDRAIL_REQUEST_DECISION.DENY_ALWAYS),
                makeDefaultTools('done')
            )
            const gen = g.checkToolCall(makeToolCall('my_tool'), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.BLOCK)
        })

        it('does not yield an event when approve_always rule applies', async () => {
            const g = new ToolPermissionGuardrail(
                makeRulesStoreWithRule(GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS),
                makeDefaultTools('done')
            )
            const gen = g.checkToolCall(makeToolCall('my_tool'), 'session-1')
            const step = await gen.next()
            expect(step.done).toBe(true)
        })
    })

    describe('abort()', () => {
        it('resolves all pending requests for a session with ABORTED', async () => {
            const gen = guardrail.checkToolCall(makeToolCall('abort_tool'), 'session-abort')
            const firstStep = await gen.next()
            expect(firstStep.done).toBe(false)

            const [secondStep] = await Promise.all([
                gen.next(),
                Promise.resolve().then(() => {
                    guardrail.abort('session-abort')
                })
            ])

            if (!secondStep.done) throw new Error('Expected generator to be done')
            expect(secondStep.value.action).toBe(GUARDRAIL_ACTION.BLOCK)
        })

        it('does not affect pending requests from other sessions', async () => {
            const gen = guardrail.checkToolCall(makeToolCall('cross_session'), 'session-a')
            const firstStep = await gen.next()
            if (firstStep.done) throw new Error('Expected generator to yield')

            const [secondStep] = await Promise.all([
                gen.next(),
                Promise.resolve().then(() => {
                    guardrail.abort('session-b')
                    guardrail.resolve(firstStep.value.requestId, GUARDRAIL_REQUEST_DECISION.APPROVE)
                })
            ])

            if (!secondStep.done) throw new Error('Expected generator to be done')
            expect(secondStep.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })
    })

    describe('GuardrailResolverAggregator', () => {
        it('delegates resolve to all sub-resolvers', () => {
            const r1 = { resolve: jest.fn(), abort: jest.fn() }
            const r2 = { resolve: jest.fn(), abort: jest.fn() }
            const aggregator = new GuardrailResolverAggregator([r1, r2])
            aggregator.resolve('req-1', GUARDRAIL_REQUEST_DECISION.APPROVE)
            expect(r1.resolve).toHaveBeenCalledWith('req-1', GUARDRAIL_REQUEST_DECISION.APPROVE)
            expect(r2.resolve).toHaveBeenCalledWith('req-1', GUARDRAIL_REQUEST_DECISION.APPROVE)
        })

        it('delegates abort to all sub-resolvers', () => {
            const r1 = { resolve: jest.fn(), abort: jest.fn() }
            const r2 = { resolve: jest.fn(), abort: jest.fn() }
            const aggregator = new GuardrailResolverAggregator([r1, r2])
            aggregator.abort('session-x')
            expect(r1.abort).toHaveBeenCalledWith('session-x')
            expect(r2.abort).toHaveBeenCalledWith('session-x')
        })
    })
})
