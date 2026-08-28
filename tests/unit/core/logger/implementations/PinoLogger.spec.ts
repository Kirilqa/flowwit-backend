import { DestinationStream } from 'pino'
import { PinoLogger } from '@logger'

function makeCapturingStream(): { stream: DestinationStream; lines: () => Array<Record<string, unknown>> } {
    const chunks: Array<string> = []
    const stream: DestinationStream = {
        write(msg: string): void {
            chunks.push(msg)
        }
    }

    return {
        stream,
        lines: () =>
            chunks
                .join('')
                .split('\n')
                .filter(line => line.length > 0)
                .map(line => JSON.parse(line) as Record<string, unknown>)
    }
}

describe('PinoLogger', () => {
    it('creates a working logger with default options and stream when none are provided', () => {
        const logger = PinoLogger.create()
        expect(() => {
            logger.info('goes to stdout, not captured')
        }).not.toThrow()
    })

    it('writes the message and level for info()', () => {
        const { stream, lines } = makeCapturingStream()
        const logger = PinoLogger.create({}, stream)

        logger.info('hello world', { foo: 'bar' })

        const [entry] = lines()
        expect(entry).toMatchObject({ msg: 'hello world', foo: 'bar', level: 30 })
    })

    it('writes error() at a higher level than warn()', () => {
        const { stream, lines } = makeCapturingStream()
        const logger = PinoLogger.create({}, stream)

        logger.warn('a warning')
        logger.error('an error')

        const [warnEntry, errorEntry] = lines()
        expect(warnEntry?.['level']).toBeLessThan(errorEntry?.['level'] as number)
    })

    it('does not emit debug() when level is info (the default)', () => {
        const { stream, lines } = makeCapturingStream()
        const logger = PinoLogger.create({}, stream)

        logger.debug('should be suppressed')

        expect(lines()).toHaveLength(0)
    })

    it('redacts known sensitive keys by default', () => {
        const { stream, lines } = makeCapturingStream()
        const logger = PinoLogger.create({}, stream)

        logger.info('connecting', { apiKey: 'sk-real-secret' })

        const [entry] = lines()
        expect(entry?.['apiKey']).toBe('[Redacted]')
    })

    it('adds the scope binding for child loggers', () => {
        const { stream, lines } = makeCapturingStream()
        const logger = PinoLogger.create({}, stream)
        const scoped = logger.child('MyModule')

        scoped.info('scoped message')

        const [entry] = lines()
        expect(entry).toMatchObject({ msg: 'scoped message', scope: 'MyModule' })
    })
})
