import fs from 'fs/promises'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { patchFileToolSchema } from './validators'

export class PatchFileTool extends BaseFileSystemTool<typeof patchFileToolSchema> {
    readonly name = 'filesystem_patch_file'
    readonly description =
        'Replaces a specific range of lines in a file with new content. Does not rewrite the entire file. Use filesystem_read_file_chunk first to confirm the exact lines to patch.'
    readonly schema = patchFileToolSchema

    protected async run(
        args: z.infer<typeof patchFileToolSchema>,
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
        const original = await fs.readFile(resolved, 'utf-8')
        const lines = original.split('\n')
        const totalLines = lines.length

        if (args.fromLine > totalLines) {
            throw new AgentToolError(`Line ${args.fromLine} is out of range. File has ${totalLines} lines.`)
        }

        const fromIndex = args.fromLine - 1
        const toIndex = Math.min(args.toLine - 1, totalLines - 1)

        const replacementLines = args.content.split('\n')

        const patched = [...lines.slice(0, fromIndex), ...replacementLines, ...lines.slice(toIndex + 1)].join('\n')

        await fs.writeFile(resolved, patched, 'utf-8')

        const replacedCount = toIndex - fromIndex + 1

        return `Patched "${args.path}": replaced ${replacedCount} line${replacedCount === 1 ? '' : 's'} (${args.fromLine}–${args.toLine}) with ${replacementLines.length} line${replacementLines.length === 1 ? '' : 's'}`
    }
}
