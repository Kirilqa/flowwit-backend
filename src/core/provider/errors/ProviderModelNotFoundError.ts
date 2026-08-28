import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderModelNotFoundError extends ProviderError {
    constructor(message = 'Model not found', options?: ErrorOptions) {
        super(message, options)
    }
}
