import { ErrorOptions } from '@core/types'
import { AgentError } from '@agent/errors'

export class AgentToolError extends AgentError {
    constructor(message = 'Tool execution failed', options?: ErrorOptions) {
        super(message, options)
    }
}
