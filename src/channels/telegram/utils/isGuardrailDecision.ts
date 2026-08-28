import { GUARDRAIL_REQUEST_DECISION, GuardrailRequestDecision } from '@guardrail'

export function isGuardrailDecision(value: string): value is GuardrailRequestDecision {
    return (Object.values(GUARDRAIL_REQUEST_DECISION) as ReadonlyArray<string>).includes(value)
}
