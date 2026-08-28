import { ErrorOptions } from '@core/types'
import { AgentError } from '@agent/errors'

export class AgentMCPError extends AgentError {
    constructor(message = 'MCP operation failed', options?: ErrorOptions) {
        super(message, options)
    }
}
