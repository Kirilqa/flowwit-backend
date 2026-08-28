/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/?(*.)+(spec|test).ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@provider$': '<rootDir>/src/core/provider/index.ts',
        '^@provider/(.*)$': '<rootDir>/src/core/provider/$1',
        '^@agent$': '<rootDir>/src/core/agent/index.ts',
        '^@agent/(.*)$': '<rootDir>/src/core/agent/$1',
        '^@mcp$': '<rootDir>/src/core/mcp/index.ts',
        '^@mcp/(.*)$': '<rootDir>/src/core/mcp/$1',
        '^@skill$': '<rootDir>/src/core/skill/index.ts',
        '^@skill/(.*)$': '<rootDir>/src/core/skill/$1',
        '^@session$': '<rootDir>/src/core/session/index.ts',
        '^@session/(.*)$': '<rootDir>/src/core/session/$1',
        '^@observability$': '<rootDir>/src/core/observability/index.ts',
        '^@observability/(.*)$': '<rootDir>/src/core/observability/$1',
        '^@memory$': '<rootDir>/src/core/memory/index.ts',
        '^@memory/(.*)$': '<rootDir>/src/core/memory/$1',
        '^@guardrail$': '<rootDir>/src/core/guardrail/index.ts',
        '^@guardrail/(.*)$': '<rootDir>/src/core/guardrail/$1',
        '^@strategy$': '<rootDir>/src/core/strategy/index.ts',
        '^@strategy/(.*)$': '<rootDir>/src/core/strategy/$1',
        '^@command$': '<rootDir>/src/core/command/index.ts',
        '^@command/(.*)$': '<rootDir>/src/core/command/$1',
        '^@tool$': '<rootDir>/src/core/tool/index.ts',
        '^@tool/(.*)$': '<rootDir>/src/core/tool/$1',
        '^@workflow$': '<rootDir>/src/core/workflow/index.ts',
        '^@workflow/(.*)$': '<rootDir>/src/core/workflow/$1',
        '^@channel$': '<rootDir>/src/core/channel/index.ts',
        '^@channel/(.*)$': '<rootDir>/src/core/channel/$1',
        '^@scheduler$': '<rootDir>/src/core/scheduler/index.ts',
        '^@scheduler/(.*)$': '<rootDir>/src/core/scheduler/$1',
        '^@watcher$': '<rootDir>/src/core/watcher/index.ts',
        '^@watcher/(.*)$': '<rootDir>/src/core/watcher/$1',
        '^@logger$': '<rootDir>/src/core/logger/index.ts',
        '^@logger/(.*)$': '<rootDir>/src/core/logger/$1',
        '^@config$': '<rootDir>/src/core/config/index.ts',
        '^@config/(.*)$': '<rootDir>/src/core/config/$1'
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.test.json'
            }
        ]
    }
}
