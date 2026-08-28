import { basename } from 'path'
import { ExecuteCommandTool } from '@tool/implementations/shell/ExecuteCommandTool'
import { AgentToolError } from '@tool/errors'
import { ShellResult } from '@tool/implementations/shell/types'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

function nodeScript(code: string): string {
    return `node -e "${code.replace(/"/g, '\\"')}"`
}

async function run(tool: ExecuteCommandTool, args: Record<string, unknown>): Promise<ShellResult> {
    return (await tool.execute(args, 'agent-1', 'session-1')) as ShellResult
}

describe('ExecuteCommandTool (integration)', () => {
    it('has correct name', () => {
        expect(new ExecuteCommandTool().name).toBe('execute_command')
    })

    it('includes the current platform in the description', () => {
        const description = new ExecuteCommandTool().description
        expect(description).toMatch(/Windows|Linux|macOS/)
    })

    it('captures stdout for a successful command', async () => {
        const tool = new ExecuteCommandTool()
        const result = await run(tool, { command: nodeScript("process.stdout.write('hello from node')") })
        expect(result.stdout).toBe('hello from node')
        expect(result.exitCode).toBe(0)
    })

    it('captures stderr without failing when the exit code is 0', async () => {
        const tool = new ExecuteCommandTool()
        const result = await run(tool, {
            command: nodeScript("process.stderr.write('a warning'); process.stdout.write('ok')")
        })
        expect(result.stderr).toBe('a warning')
        expect(result.stdout).toBe('ok')
        expect(result.exitCode).toBe(0)
    })

    it('throws AgentToolError with stderr as the message on a non-zero exit code', async () => {
        const tool = new ExecuteCommandTool()
        await expect(
            run(tool, { command: nodeScript("process.stderr.write('boom'); process.exit(1)") })
        ).rejects.toThrow(AgentToolError)

        let caught: unknown
        try {
            await run(tool, { command: nodeScript("process.stderr.write('boom'); process.exit(1)") })
        } catch (error) {
            caught = error
        }
        expect(caught).toHaveProperty('message', expect.stringContaining('boom'))
    })

    it('runs the command in the cwd passed via args, overriding the constructor default', async () => {
        const tempDir = await makeTempDir('exec-cwd-test')
        try {
            const tool = new ExecuteCommandTool({ cwd: '/definitely/not/used' })
            const result = await run(tool, { command: nodeScript('process.stdout.write(process.cwd())'), cwd: tempDir })
            expect(result.stdout.toLowerCase()).toContain(basename(tempDir).toLowerCase())
        } finally {
            await removeTempDir(tempDir)
        }
    })

    it('falls back to the constructor cwd when no per-call cwd is given', async () => {
        const tempDir = await makeTempDir('exec-cwd-fallback-test')
        try {
            const tool = new ExecuteCommandTool({ cwd: tempDir })
            const result = await run(tool, { command: nodeScript('process.stdout.write(process.cwd())') })
            expect(result.stdout.toLowerCase()).toContain(basename(tempDir).toLowerCase())
        } finally {
            await removeTempDir(tempDir)
        }
    })

    it('resolves with a null exit code and a timeout message when the command exceeds timeoutMs', async () => {
        const tool = new ExecuteCommandTool()
        let caught: unknown
        try {
            await run(tool, { command: nodeScript('setTimeout(() => {}, 5000)'), timeoutMs: 200 })
        } catch (error) {
            caught = error
        }
        expect(caught).toBeInstanceOf(AgentToolError)
        expect(caught).toHaveProperty('message', expect.stringContaining('Process timed out after 200ms'))
    }, 10_000)

    it('rejects a blocked command before spawning it', async () => {
        const tool = new ExecuteCommandTool({ blockedCommands: ['node'] })
        await expect(run(tool, { command: nodeScript("process.stdout.write('should not run')") })).rejects.toThrow(
            AgentToolError
        )
    })

    it('rejects a command not in the allowedCommands list', async () => {
        const tool = new ExecuteCommandTool({ allowedCommands: ['git'] })
        await expect(run(tool, { command: nodeScript("process.stdout.write('nope')") })).rejects.toThrow(AgentToolError)
    })
})
