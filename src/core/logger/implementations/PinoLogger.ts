import pino, { DestinationStream, Logger as PinoInstance, LoggerOptions } from 'pino'
import { LoggerInterface } from '../interfaces'

const SENSITIVE_KEYS = [
    'apiKey',
    'token',
    'password',
    'secret',
    'env',
    'headers.authorization',
    'headers.Authorization'
]

const DEFAULT_REDACT_PATHS = SENSITIVE_KEYS.flatMap(key => [key, `*.${key}`])

export class PinoLogger implements LoggerInterface {
    private constructor(private readonly instance: PinoInstance) {}

    static create(options: LoggerOptions = {}, stream?: DestinationStream): PinoLogger {
        const mergedOptions: LoggerOptions = {
            level: 'info',
            redact: { paths: DEFAULT_REDACT_PATHS, censor: '[Redacted]' },
            ...options
        }

        return new PinoLogger(stream ? pino(mergedOptions, stream) : pino(mergedOptions))
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.instance.debug(meta ?? {}, message)
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.instance.info(meta ?? {}, message)
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.instance.warn(meta ?? {}, message)
    }

    error(message: string, meta?: Record<string, unknown>): void {
        this.instance.error(meta ?? {}, message)
    }

    child(scope: string): LoggerInterface {
        return new PinoLogger(this.instance.child({ scope }))
    }
}
