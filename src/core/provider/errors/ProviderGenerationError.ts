import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderGenerationError extends ProviderError {
    constructor(message = 'An error occurred during generation', options?: ErrorOptions) {
        super(message, options)
    }
}
