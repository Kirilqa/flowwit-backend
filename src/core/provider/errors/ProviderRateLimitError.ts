import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderRateLimitError extends ProviderError {
    constructor(message = 'The provider rate limit has been exceeded', options?: ErrorOptions) {
        super(message, options)
    }
}
