import { ErrorOptions } from '@core/types'
import { ProviderError } from './ProviderError'

export class ProviderUnsupportedCapabilityError extends ProviderError {
    constructor(message = 'The provider does not support the requested capability', options?: ErrorOptions) {
        super(message, options)
    }
}
