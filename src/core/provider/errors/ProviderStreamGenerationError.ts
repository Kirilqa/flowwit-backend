import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderStreamGenerationError extends ProviderError {
    constructor(message = 'An error occurred during streaming generation', options?: ErrorOptions) {
        super(message, options)
    }
}
