import { ErrorOptions } from '@core/types'
import { AgentError } from '@agent/errors'

export class AgentSessionError extends AgentError {
    constructor(message = 'Agent session operation failed', options?: ErrorOptions) {
        super(message, options)
    }
}
