import { ChildProcess, spawn } from 'child_process'
import { ShellResult } from '../types'

export type SpawnProcessOptions = {
    cwd?: string
    timeoutMs: number
    shell?: boolean
}

export const spawnProcess = (
    command: string,
    args: Array<string>,
    options: SpawnProcessOptions
): Promise<ShellResult> => {
    return new Promise((resolve, reject) => {
        let timedOut = false

        const child = spawn(command, args, {
            shell: options.shell ?? false,
            ...(options.cwd !== undefined && { cwd: options.cwd }),
            detached: process.platform !== 'win32'
        })

        const timer = setTimeout(() => {
            timedOut = true
            killProcessTree(child)
        }, options.timeoutMs)

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
        })

        child.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString()
        })

        child.on('close', code => {
            clearTimeout(timer)

            if (timedOut) {
                resolve({ stdout, stderr: `Process timed out after ${options.timeoutMs}ms`, exitCode: null })
                return
            }

            resolve({ stdout, stderr, exitCode: code })
        })

        child.on('error', error => {
            clearTimeout(timer)

            if (timedOut) {
                resolve({ stdout, stderr: `Process timed out after ${options.timeoutMs}ms`, exitCode: null })
                return
            }

            reject(error)
        })
    })
}

const killProcessTree = (child: ChildProcess): void => {
    if (child.pid === undefined) return

    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
        return
    }

    try {
        process.kill(-child.pid, 'SIGKILL')
    } catch {
        child.kill('SIGKILL')
    }
}
