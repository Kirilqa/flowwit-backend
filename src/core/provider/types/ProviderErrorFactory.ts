import { ProviderError } from '../errors'
import { ErrorOptions } from '@core/types'

export type ProviderErrorFactory = (message: string, options?: ErrorOptions) => ProviderError
