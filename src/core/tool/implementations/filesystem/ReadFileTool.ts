import fs from 'fs/promises'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { readFileToolSchema } from './validators'

const MAX_OUTPUT_LENGTH = 40_000

export class ReadFileTool extends BaseFileSystemTool<typeof readFileToolSchema> {
    readonly name = 'filesystem_read_file'
    readonly description = 'Reads the contents of a file at the given path and returns it as text'
    readonly schema = readFileToolSchema

    protected async run(
        args: z.infer<typeof readFileToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolved = this.resolvePath(args.path, workingDirectory)
        const content = await fs.readFile(resolved, 'utf-8')

        if (content.length > MAX_OUTPUT_LENGTH) {
            throw new AgentToolError(
                `File is too large to read at once (${content.length} chars, limit is ${MAX_OUTPUT_LENGTH}). Use filesystem_read_file_chunk to read the file in parts by specifying fromLine and toLine. If filesystem_read_file_chunk is not available, check if you have another tool that supports partial file reading. If no such tool is available — inform the user that the file is too large to read.`
            )
        }

        return content
    }
}
