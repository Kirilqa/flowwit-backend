import { z } from 'zod'
import { BaseShellTool } from './bases/BaseShellTool'
import { ShellResult } from './types'
import { spawnProcess } from './utils/spawnProcess'
import { executeCommandToolSchema } from './validators'
import { AgentToolError } from '../../errors'

export class ExecuteCommandTool extends BaseShellTool<typeof executeCommandToolSchema> {
    readonly name = 'execute_command'
    readonly schema = executeCommandToolSchema

    get description(): string {
        return `Executes a shell command and returns stdout, stderr and exit code. Current platform: ${this.platform}. This is a tool of last resort — always prefer specialized tools over this one: use filesystem tools for file and directory operations, HTTP tools for web requests and API calls, browser tools for web scraping and page interaction, and so on. Only use this tool when no specialized tool exists for the task`
    }

    protected async run(
        args: z.infer<typeof executeCommandToolSchema>,
        _agentId: string,
        _sessiomId: string,
        workingDirectory?: string
    ): Promise<ShellResult> {
        this.validateCommand(args.command)

        const cwd = args.cwd ?? workingDirectory ?? this.cwd
        const timeoutMs = args.timeoutMs ?? this.timeoutMs

        const result = await spawnProcess(args.command, [], {
            ...(cwd !== undefined && { cwd }),
            timeoutMs,
            shell: true
        })

        if (result.exitCode !== 0) {
            throw new AgentToolError(result.stderr)
        }

        return result
    }
}
