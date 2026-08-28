import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { copyToolSchema } from './validators'

export class CopyTool extends BaseFileSystemTool<typeof copyToolSchema> {
    readonly name = 'filesystem_copy'
    readonly description =
        'Copies a file or directory from source to destination. Directories are copied recursively including all contents. Creates any missing parent directories at the destination'
    readonly schema = copyToolSchema

    protected async run(
        args: z.infer<typeof copyToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolvedSource = this.resolvePath(args.source, workingDirectory)
        const resolvedDestination = this.resolvePath(args.destination, workingDirectory)

        await fs.mkdir(path.dirname(resolvedDestination), { recursive: true })
        await fs.cp(resolvedSource, resolvedDestination, { recursive: true })

        return `"${args.source}" copied to "${args.destination}" successfully`
    }
}
