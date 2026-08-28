import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool } from '../../bases/BaseTool'
import { AgentToolError } from '../../../errors'
import { ShellToolOptions } from '../types'

const DEFAULT_TIMEOUT_MS = 30_000

const PLATFORM_LABELS: Partial<Record<NodeJS.Platform, string>> = {
    win32: 'Windows',
    linux: 'Linux',
    darwin: 'macOS'
}

export abstract class BaseShellTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    protected get platform(): string {
        return PLATFORM_LABELS[process.platform] ?? process.platform
    }

    protected readonly cwd?: string
    protected readonly allowedCommands?: Array<string>
    protected readonly blockedCommands?: Array<string>
    protected readonly timeoutMs: number

    constructor(options?: ShellToolOptions) {
        super()

        if (options?.cwd !== undefined) {
            this.cwd = options.cwd
        }

        if (options?.allowedCommands !== undefined) {
            this.allowedCommands = options.allowedCommands
        }

        if (options?.blockedCommands !== undefined) {
            this.blockedCommands = options.blockedCommands
        }

        this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    }

    protected validateCommand(command: string): void {
        const executable = this.extractExecutable(command)

        if (this.allowedCommands !== undefined) {
            if (!this.allowedCommands.includes(executable)) {
                throw new AgentToolError(
                    `Command "${executable}" is not allowed. Allowed commands: ${this.allowedCommands.join(', ')}`
                )
            }

            return
        }

        if (this.blockedCommands?.includes(executable)) {
            throw new AgentToolError(`Command "${executable}" is blocked`)
        }
    }

    private extractExecutable(command: string): string {
        return command.trim().split(/\s+/)[0] ?? ''
    }
}
