import { LoggerInterface } from '../interfaces'

export class NoopLogger implements LoggerInterface {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally discards the log line
    debug(_message: string, _meta?: Record<string, unknown>): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally discards the log line
    info(_message: string, _meta?: Record<string, unknown>): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally discards the log line
    warn(_message: string, _meta?: Record<string, unknown>): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally discards the log line
    error(_message: string, _meta?: Record<string, unknown>): void {}

    child(_scope: string): LoggerInterface {
        return this
    }
}
