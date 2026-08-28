import { z } from 'zod'
import { BaseShellTool } from '@tool/implementations/shell/bases/BaseShellTool'
import { AgentToolError } from '@tool/errors'
import { ShellToolOptions } from '@tool/implementations/shell/types'

const schema = z.object({ command: z.string() })

class TestShellTool extends BaseShellTool<typeof schema> {
    readonly name = 'test_shell_tool'
    readonly description = 'test'
    readonly schema = schema

    validateCommandPublic(command: string): void {
        this.validateCommand(command)
    }

    get platformPublic(): string {
        return this.platform
    }

    get cwdPublic(): string | undefined {
        return this.cwd
    }

    get timeoutMsPublic(): number {
        return this.timeoutMs
    }

    protected async run(args: z.infer<typeof schema>): Promise<unknown> {
        return args
    }
}

function makeTool(options?: ShellToolOptions): TestShellTool {
    return new TestShellTool(options)
}

describe('BaseShellTool', () => {
    describe('validateCommand()', () => {
        it('allows any command when neither allowedCommands nor blockedCommands are set', () => {
            const tool = makeTool()
            expect(() => {
                tool.validateCommandPublic('rm -rf /')
            }).not.toThrow()
        })

        it('allows a command in the allowedCommands list', () => {
            const tool = makeTool({ allowedCommands: ['git', 'npm'] })
            expect(() => {
                tool.validateCommandPublic('git status')
            }).not.toThrow()
        })

        it('throws AgentToolError for a command not in the allowedCommands list', () => {
            const tool = makeTool({ allowedCommands: ['git'] })
            expect(() => {
                tool.validateCommandPublic('rm -rf /')
            }).toThrow(AgentToolError)
        })

        it('includes the allowed commands in the error message', () => {
            const tool = makeTool({ allowedCommands: ['git', 'npm'] })
            let caught: unknown
            try {
                tool.validateCommandPublic('rm -rf /')
            } catch (error) {
                caught = error
            }
            expect(caught).toBeInstanceOf(AgentToolError)
            expect(caught).toHaveProperty('message', expect.stringContaining('git, npm'))
        })

        it('throws AgentToolError for a command in the blockedCommands list', () => {
            const tool = makeTool({ blockedCommands: ['rm'] })
            expect(() => {
                tool.validateCommandPublic('rm -rf /')
            }).toThrow(AgentToolError)
        })

        it('allows a command not in the blockedCommands list', () => {
            const tool = makeTool({ blockedCommands: ['rm'] })
            expect(() => {
                tool.validateCommandPublic('git status')
            }).not.toThrow()
        })

        it('lets allowedCommands take precedence when both allowedCommands and blockedCommands are set', () => {
            const tool = makeTool({ allowedCommands: ['rm'], blockedCommands: ['rm'] })
            expect(() => {
                tool.validateCommandPublic('rm -rf /')
            }).not.toThrow()
        })

        it('extracts the executable as the first whitespace-separated token, ignoring extra spacing', () => {
            const tool = makeTool({ allowedCommands: ['git'] })
            expect(() => {
                tool.validateCommandPublic('   git   status --short')
            }).not.toThrow()
        })
    })

    describe('platform', () => {
        it('returns a known platform label for the current process.platform', () => {
            const tool = makeTool()
            expect(['Windows', 'Linux', 'macOS', process.platform]).toContain(tool.platformPublic)
        })

        it('falls back to the raw process.platform value for an unmapped platform', () => {
            const original = process.platform
            Object.defineProperty(process, 'platform', { value: 'sunos', configurable: true })
            try {
                const tool = makeTool()
                expect(tool.platformPublic).toBe('sunos')
            } finally {
                Object.defineProperty(process, 'platform', { value: original, configurable: true })
            }
        })
    })

    describe('constructor options', () => {
        it('defaults timeoutMs to 30000 when not provided', () => {
            expect(makeTool().timeoutMsPublic).toBe(30_000)
        })

        it('uses a custom timeoutMs when provided', () => {
            expect(makeTool({ timeoutMs: 5000 }).timeoutMsPublic).toBe(5000)
        })

        it('leaves cwd undefined when not provided', () => {
            expect(makeTool().cwdPublic).toBeUndefined()
        })

        it('sets cwd from options', () => {
            expect(makeTool({ cwd: '/tmp/work' }).cwdPublic).toBe('/tmp/work')
        })
    })
})
