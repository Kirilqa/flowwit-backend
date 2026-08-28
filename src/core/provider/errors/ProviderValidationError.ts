import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderValidationError extends ProviderError {
    constructor(message = 'The provider request failed validation', options?: ErrorOptions) {
        super(message, options)
    }
}
