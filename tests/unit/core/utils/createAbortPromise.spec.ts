import { createAbortPromise } from '@core/utils/createAbortPromise'

describe('createAbortPromise', () => {
    it('returns a promise and a cleanup function', () => {
        const controller = new AbortController()
        const result = createAbortPromise(controller.signal)

        expect(result.promise).toBeInstanceOf(Promise)
        expect(typeof result.cleanup).toBe('function')
    })

    it('rejects the promise when the signal is aborted', async () => {
        const controller = new AbortController()
        const { promise } = createAbortPromise(controller.signal)

        controller.abort()

        await expect(promise).rejects.toThrow('Promise was aborted')
    })

    it('uses the custom error factory when signal is aborted', async () => {
        const controller = new AbortController()
        const customError = new Error('custom abort reason')
        const { promise } = createAbortPromise(controller.signal, () => customError)

        controller.abort()

        await expect(promise).rejects.toBe(customError)
    })

    it('cleanup removes the abort listener so the promise never rejects after cleanup', async () => {
        const controller = new AbortController()
        const { promise, cleanup } = createAbortPromise(controller.signal)

        cleanup()
        controller.abort()

        const result = await Promise.race([
            promise.then(() => 'resolved').catch(() => 'rejected'),
            Promise.resolve('no-event')
        ])

        expect(result).toBe('no-event')
    })
})
