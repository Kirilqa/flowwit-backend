import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { writeFileToolSchema } from './validators'

export class WriteFileTool extends BaseFileSystemTool<typeof writeFileToolSchema> {
    readonly name = 'filesystem_write_file'
    readonly description =
        'Writes text content to a file at the given path. Creates the file and any missing parent directories if they do not exist. Overwrites the file if it already exists'
    readonly schema = writeFileToolSchema

    protected async run(
        args: z.infer<typeof writeFileToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolved = this.resolvePath(args.path, workingDirectory)

        await fs.mkdir(path.dirname(resolved), { recursive: true })
        await fs.writeFile(resolved, args.content, 'utf-8')

        return `File "${args.path}" written successfully`
    }
}
