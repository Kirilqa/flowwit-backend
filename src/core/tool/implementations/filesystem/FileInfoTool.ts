import fs from 'fs/promises'
import { z } from 'zod'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { FILE_SYSTEM_ENTRY_TYPE, FileSystemEntryType } from './types'
import { fileInfoToolSchema } from './validators'

type FileInfo = {
    path: string
    type: FileSystemEntryType
    size: number
    createdAt: string
    modifiedAt: string
    accessedAt: string
    isReadonly: boolean
}

export class FileInfoTool extends BaseFileSystemTool<typeof fileInfoToolSchema> {
    readonly name = 'filesystem_file_info'
    readonly description =
        'Returns metadata of a file or directory: type, size in bytes, created/modified/accessed timestamps and readonly flag'
    readonly schema = fileInfoToolSchema

    protected async run(
        args: z.infer<typeof fileInfoToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<FileInfo> {
        const resolved = this.resolvePath(args.path, workingDirectory)
        const stat = await fs.stat(resolved)

        const type: FileSystemEntryType = stat.isDirectory()
            ? FILE_SYSTEM_ENTRY_TYPE.DIRECTORY
            : stat.isFile()
              ? FILE_SYSTEM_ENTRY_TYPE.FILE
              : stat.isSymbolicLink()
                ? FILE_SYSTEM_ENTRY_TYPE.SYMLINK
                : FILE_SYSTEM_ENTRY_TYPE.OTHER

        const isReadonly = await this.checkIsReadonly(resolved)

        return {
            path: args.path,
            type,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
            modifiedAt: stat.mtime.toISOString(),
            accessedAt: stat.atime.toISOString(),
            isReadonly
        }
    }

    private async checkIsReadonly(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath, fs.constants.W_OK)
            return false
        } catch {
            return true
        }
    }
}
