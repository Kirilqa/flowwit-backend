import { ErrorOptions } from '@core/types'
import { AgentError } from './AgentError'

export class AgentUnexpectedError extends AgentError {
    constructor(message = 'An unexpected error occurred in agent', options?: ErrorOptions) {
        super(message, options)
    }
}
