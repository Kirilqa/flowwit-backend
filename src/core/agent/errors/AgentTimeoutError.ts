import { ErrorOptions } from '@core/types'
import { AgentError } from './AgentError'

export class AgentTimeoutError extends AgentError {
    constructor(message = 'Agent operation timed out', options?: ErrorOptions) {
        super(message, options)
    }
}
