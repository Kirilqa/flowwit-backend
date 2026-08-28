import fs from 'fs/promises'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { createDirectoryToolSchema } from './validators'

export class CreateDirectoryTool extends BaseFileSystemTool<typeof createDirectoryToolSchema> {
    readonly name = 'filesystem_create_directory'
    readonly description = 'Creates a directory at the given path. Creates all missing parent directories automatically'
    readonly schema = createDirectoryToolSchema

    protected async run(
        args: z.infer<typeof createDirectoryToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolved = this.resolvePath(args.path, workingDirectory)

        await fs.mkdir(resolved, { recursive: true })

        return `Directory "${args.path}" created successfully`
    }
}
