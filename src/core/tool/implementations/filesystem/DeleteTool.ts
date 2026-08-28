import fs from 'fs/promises'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { deleteToolSchema } from './validators'

export class DeleteTool extends BaseFileSystemTool<typeof deleteToolSchema> {
    readonly name = 'filesystem_delete'
    readonly description =
        'Deletes a file or directory at the given path. Directories are deleted recursively including all contents'
    readonly schema = deleteToolSchema

    protected async run(
        args: z.infer<typeof deleteToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolved = this.resolvePath(args.path, workingDirectory)
        const stat = await fs.stat(resolved)

        if (stat.isDirectory()) {
            await fs.rm(resolved, { recursive: true, force: true })
        } else {
            await fs.unlink(resolved)
        }

        return `"${args.path}" deleted successfully`
    }
}
