import { ErrorOptions } from '@core/types'
import { AgentError } from '../../errors'

export class AgentBudgetError extends AgentError {
    constructor(message = 'Agent budget limit exceeded', options?: ErrorOptions) {
        super(message, options)
    }
}
