import { GuardrailInterface, GUARDRAIL_ACTION, GuardrailCheckResult, GuardrailEvent } from '@guardrail'
import { NoopGuardrail } from '@guardrail/implementations/guardrail/NoopGuardrail'

async function exhaust(gen: AsyncGenerator<GuardrailEvent, GuardrailCheckResult>): Promise<GuardrailCheckResult> {
    while (true) {
        const step = await gen.next()
        if (step.done) {
            return step.value
        }
    }
}

describe('NoopGuardrail', () => {
    const guardrail: GuardrailInterface = new NoopGuardrail()

    it('checkInput returns ALLOW', async () => {
        const result = await exhaust(guardrail.checkInput('hello', 'session-1'))
        expect(result.action).toBe(GUARDRAIL_ACTION.ALLOW)
    })

    it('checkInput yields no events', async () => {
        const events: Array<GuardrailEvent> = []
        const gen = guardrail.checkInput('hello', 'session-1')
        while (true) {
            const step = await gen.next()
            if (step.done) break
            events.push(step.value)
        }
        expect(events).toHaveLength(0)
    })

    it('checkOutput returns ALLOW', async () => {
        const result = await exhaust(guardrail.checkOutput('response', 'session-1'))
        expect(result.action).toBe(GUARDRAIL_ACTION.ALLOW)
    })

    it('checkOutput yields no events', async () => {
        const events: Array<GuardrailEvent> = []
        const gen = guardrail.checkOutput('response', 'session-1')
        while (true) {
            const step = await gen.next()
            if (step.done) break
            events.push(step.value)
        }
        expect(events).toHaveLength(0)
    })

    it('checkToolCall returns ALLOW', async () => {
        const result = await exhaust(guardrail.checkToolCall({ id: 'c-1', name: 'search', arguments: {} }, 'session-1'))
        expect(result.action).toBe(GUARDRAIL_ACTION.ALLOW)
    })

    it('checkToolCall yields no events', async () => {
        const events: Array<GuardrailEvent> = []
        const gen = guardrail.checkToolCall({ id: 'c-1', name: 'search', arguments: {} }, 'session-1')
        while (true) {
            const step = await gen.next()
            if (step.done) break
            events.push(step.value)
        }
        expect(events).toHaveLength(0)
    })
})
