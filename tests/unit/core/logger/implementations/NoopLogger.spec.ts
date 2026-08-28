import { NoopLogger } from '@logger'

describe('NoopLogger', () => {
    it('does not throw for any log level', () => {
        const logger = new NoopLogger()
        expect(() => {
            logger.debug('x')
        }).not.toThrow()
        expect(() => {
            logger.info('x', { a: 1 })
        }).not.toThrow()
        expect(() => {
            logger.warn('x')
        }).not.toThrow()
        expect(() => {
            logger.error('x')
        }).not.toThrow()
    })

    it('returns itself from child()', () => {
        const logger = new NoopLogger()
        expect(logger.child('scope')).toBe(logger)
    })
})
