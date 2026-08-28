import { ErrorOptions } from '@core/types'
import { AgentError } from './AgentError'

export class AgentConfigError extends AgentError {
    constructor(message = 'Invalid agent configuration', options?: ErrorOptions) {
        super(message, options)
    }
}
