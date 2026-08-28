import fs from 'fs/promises'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { readFileChunkToolSchema } from './validators'

export class ReadFileChunkTool extends BaseFileSystemTool<typeof readFileChunkToolSchema> {
    readonly name = 'filesystem_read_file_chunk'
    readonly description =
        'Reads a specific range of lines from a file. Returns lines with their line numbers. Use filesystem_read_file for full file reading.'
    readonly schema = readFileChunkToolSchema

    protected async run(
        args: z.infer<typeof readFileChunkToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        if (args.fromLine > args.toLine) {
            throw new AgentToolError(
                `Invalid range: fromLine (${args.fromLine}) must be less than or equal to toLine (${args.toLine})`
            )
        }

        const resolved = this.resolvePath(args.path, workingDirectory)
        const content = await fs.readFile(resolved, 'utf-8')
        const lines = content.split('\n')
        const totalLines = lines.length

        const fromIndex = args.fromLine - 1
        const toIndex = Math.min(args.toLine - 1, totalLines - 1)

        if (fromIndex >= totalLines) {
            throw new AgentToolError(`Line ${args.fromLine} is out of range. File has ${totalLines} lines.`)
        }

        const chunk = lines
            .slice(fromIndex, toIndex + 1)
            .map((line, i) => `${args.fromLine + i}: ${line}`)
            .join('\n')

        return chunk
    }
}
