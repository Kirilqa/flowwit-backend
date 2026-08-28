import { AbortPromiseResult } from '../types'

export function createAbortPromise(
    signal: AbortSignal,
    createError: () => Error = () => new Error('Promise was aborted')
): AbortPromiseResult {
    let onAbort: () => void

    const promise = new Promise<never>((_, reject) => {
        onAbort = () => {
            reject(createError())
        }
        signal.addEventListener('abort', onAbort, { once: true })
    })

    return {
        promise,
        cleanup: () => {
            signal.removeEventListener('abort', onAbort)
        }
    }
}
