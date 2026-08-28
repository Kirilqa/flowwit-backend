import { ErrorOptions } from '@core/types'
import { AgentError } from '@agent/errors'

export class AgentGuardrailError extends AgentError {
    constructor(message = 'Guardrail check failed', options?: ErrorOptions) {
        super(message, options)
    }
}
