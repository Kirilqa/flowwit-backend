import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderUnexpectedError extends ProviderError {
    constructor(message = 'An unexpected error occurred with the provider', options?: ErrorOptions) {
        super(message, options)
    }
}
