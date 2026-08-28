import { ErrorOptions } from '@core/types'

export abstract class ProviderError extends Error {
    public readonly cause?: unknown

    constructor(message: string, options?: ErrorOptions) {
        super(message)

        this.name = new.target.name
        this.cause = options?.cause

        Object.setPrototypeOf(this, new.target.prototype)

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- @types/node declares this as always present, but it's V8-specific and absent on other JS engines (e.g. Firefox, Safari)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
