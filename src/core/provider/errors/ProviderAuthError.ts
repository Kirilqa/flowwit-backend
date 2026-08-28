import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderAuthError extends ProviderError {
    constructor(message = 'Authentication failed', options?: ErrorOptions) {
        super(message, options)
    }
}
