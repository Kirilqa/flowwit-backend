import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderTimeoutError extends ProviderError {
    constructor(message = 'The provider request timed out', options?: ErrorOptions) {
        super(message, options)
    }
}
