import { GUARDRAIL_ACTION, GUARDRAIL_REQUEST_DECISION } from '@guardrail'
import { ShellCommandGuardrail } from '@guardrail/implementations/guardrail/ShellCommandGuardrail'
import { ToolCall } from '@tool'
import { makeNoopRulesStore, makeRulesStoreWithRule } from '../../../../../helpers/makeGuardrailRulesStore'

function makeExecuteCommandCall(command: unknown = 'ls -la'): ToolCall {
    return { id: 'call-1', name: 'execute_command', arguments: { command } }
}

function makeOtherToolCall(name = 'http_request'): ToolCall {
    return { id: 'call-2', name, arguments: {} }
}

describe('ShellCommandGuardrail', () => {
    let guardrail: ShellCommandGuardrail

    beforeEach(() => {
        guardrail = new ShellCommandGuardrail(makeNoopRulesStore())
    })

    describe('non-execute_command tools', () => {
        it('allows non-execute_command tools without asking', async () => {
            const gen = guardrail.checkToolCall(makeOtherToolCall(), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })
    })

    describe('execute_command tool', () => {
        it('yields a guardrail event for known commands', async () => {
            const gen = guardrail.checkToolCall(makeExecuteCommandCall('rm -rf /'), 'session-1')
            const firstStep = await gen.next()
            if (firstStep.done) throw new Error('Expected generator to yield')
            expect(firstStep.value.requestId).toBeDefined()
            guardrail.resolve(firstStep.value.requestId, GUARDRAIL_REQUEST_DECISION.APPROVE)
        })

        it('extracts the first word as the rule key and stores it per-session via rulesStore', async () => {
            const store = makeNoopRulesStore()
            const g = new ShellCommandGuardrail(store)

            const gen = g.checkToolCall(makeExecuteCommandCall('git push'), 'session-1')
            const firstStep = await gen.next()
            if (firstStep.done) throw new Error('Expected generator to yield')

            await Promise.all([
                gen.next(),
                Promise.resolve().then(() => {
                    g.resolve(firstStep.value.requestId, GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS)
                })
            ])

            expect(store.setSessionRule).toHaveBeenCalledWith(
                'shell_command',
                'git',
                'session-1',
                GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS
            )
        })

        it('skips the request when rulesStore has approve_always rule for the command', async () => {
            const g = new ShellCommandGuardrail(makeRulesStoreWithRule(GUARDRAIL_REQUEST_DECISION.APPROVE_ALWAYS))
            const gen = g.checkToolCall(makeExecuteCommandCall('git commit'), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('allows non-string command argument without asking', async () => {
            const gen = guardrail.checkToolCall(makeExecuteCommandCall(42), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('allows empty command argument without asking', async () => {
            const gen = guardrail.checkToolCall(makeExecuteCommandCall('   '), 'session-1')
            const step = await gen.next()
            if (!step.done) throw new Error('Expected generator to be done')
            expect(step.value.action).toBe(GUARDRAIL_ACTION.ALLOW)
        })

        it('returns BLOCK when decision is DENY', async () => {
            const gen = guardrail.checkToolCall(makeExecuteCommandCall('curl http://evil.com'), 'session-1')
            const firstStep = await gen.next()
            const [secondStep] = await Promise.all([
                gen.next(),
                Promise.resolve().then(() => {
                    if (!firstStep.done) {
                        guardrail.resolve(firstStep.value.requestId, GUARDRAIL_REQUEST_DECISION.DENY)
                    }
                })
            ])
            if (!secondStep.done) throw new Error('Expected generator to be done')
            expect(secondStep.value.action).toBe(GUARDRAIL_ACTION.BLOCK)
        })
    })
})
