import { LoggerInterface } from '@logger'

export function makeLoggerMock(): LoggerInterface {
    const logger: LoggerInterface = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn(() => logger)
    }
    return logger
}
