import { ErrorOptions } from '@core/types'
import { AgentGuardrailError } from './AgentGuardrailError'

export class AgentGuardrailDecisionRequiredError extends AgentGuardrailError {
    constructor(
        message = 'Guardrail check requires a user decision, but the current run policy does not allow waiting for one',
        options?: ErrorOptions
    ) {
        super(message, options)
    }
}
