import { GuardrailInterface } from '../../interfaces'
import { GUARDRAIL_ACTION, GuardrailCheckResult } from '../../types'
import { GuardrailEvent } from '../../types/GuardrailEvent'

export class NoopGuardrail implements GuardrailInterface {
    readonly id = 'noop'

    async *checkInput(): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    async *checkOutput(): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    async *checkToolCall(): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }
}
