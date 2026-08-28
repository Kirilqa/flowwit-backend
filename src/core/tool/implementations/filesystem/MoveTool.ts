import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { moveToolSchema } from './validators'

export class MoveTool extends BaseFileSystemTool<typeof moveToolSchema> {
    readonly name = 'filesystem_move'
    readonly description = 'Moves or renames a file or directory. Works for both files and directories'
    readonly schema = moveToolSchema

    protected async run(
        args: z.infer<typeof moveToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const resolvedSource = this.resolvePath(args.source, workingDirectory)
        const resolvedDestination = this.resolvePath(args.destination, workingDirectory)

        await fs.mkdir(path.dirname(resolvedDestination), { recursive: true })
        await fs.rename(resolvedSource, resolvedDestination)

        return `"${args.source}" moved to "${args.destination}" successfully`
    }
}
