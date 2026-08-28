import { ProviderError } from '@provider/errors/ProviderError'
import { ProviderAuthError } from '@provider/errors/ProviderAuthError'
import { ProviderGenerationError } from '@provider/errors/ProviderGenerationError'
import { ProviderModelNotFoundError } from '@provider/errors/ProviderModelNotFoundError'
import { ProviderRateLimitError } from '@provider/errors/ProviderRateLimitError'
import { ProviderStreamGenerationError } from '@provider/errors/ProviderStreamGenerationError'
import { ProviderTimeoutError } from '@provider/errors/ProviderTimeoutError'
import { ProviderUnexpectedError } from '@provider/errors/ProviderUnexpectedError'
import { ProviderUnsupportedCapabilityError } from '@provider/errors/ProviderUnsupportedCapabilityError'
import { ProviderValidationError } from '@provider/errors/ProviderValidationError'

const errorClasses = [
    { Cls: ProviderAuthError, defaultMsg: 'Authentication failed' },
    { Cls: ProviderGenerationError, defaultMsg: 'An error occurred during generation' },
    { Cls: ProviderModelNotFoundError, defaultMsg: 'Model not found' },
    { Cls: ProviderRateLimitError, defaultMsg: 'The provider rate limit has been exceeded' },
    { Cls: ProviderStreamGenerationError, defaultMsg: 'An error occurred during streaming generation' },
    { Cls: ProviderTimeoutError, defaultMsg: 'The provider request timed out' },
    { Cls: ProviderUnexpectedError, defaultMsg: 'An unexpected error occurred with the provider' },
    { Cls: ProviderUnsupportedCapabilityError, defaultMsg: 'The provider does not support the requested capability' },
    { Cls: ProviderValidationError, defaultMsg: 'The provider request failed validation' }
] as const

describe('Provider error classes', () => {
    for (const { Cls, defaultMsg } of errorClasses) {
        describe(Cls.name, () => {
            it('is an instance of ProviderError', () => {
                expect(new Cls()).toBeInstanceOf(ProviderError)
            })

            it('is an instance of Error', () => {
                expect(new Cls()).toBeInstanceOf(Error)
            })

            it('uses the class name as error.name', () => {
                expect(new Cls().name).toBe(Cls.name)
            })

            it('uses the provided message', () => {
                expect(new Cls('custom message').message).toBe('custom message')
            })

            it('falls back to the default message when none is provided', () => {
                expect(new Cls().message).toBe(defaultMsg)
            })

            it('stores cause from options', () => {
                const cause = new Error('root cause')
                const err = new Cls('msg', { cause })
                expect(err.cause).toBe(cause)
            })

            it('has undefined cause when no options provided', () => {
                expect(new Cls().cause).toBeUndefined()
            })
        })
    }
})
