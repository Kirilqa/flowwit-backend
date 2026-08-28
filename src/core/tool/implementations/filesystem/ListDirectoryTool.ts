import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { AgentToolError } from '../../errors'
import { BaseFileSystemTool } from './bases/BaseFileSystemTool'
import { FILE_SYSTEM_ENTRY_TYPE, FileSystemEntry } from './types'
import { listDirectoryToolSchema } from './validators'

const MAX_OUTPUT_LENGTH = 40_000

export class ListDirectoryTool extends BaseFileSystemTool<typeof listDirectoryToolSchema> {
    readonly name = 'filesystem_list_directory'
    readonly description =
        'Lists the contents of a directory. Use recursive mode to get the full directory tree including all subdirectories'
    readonly schema = listDirectoryToolSchema

    protected async run(
        args: z.infer<typeof listDirectoryToolSchema>,
        _agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<Array<FileSystemEntry>> {
        const resolved = this.resolvePath(args.path, workingDirectory)

        const entries = args.recursive
            ? await this.listRecursive(resolved, resolved)
            : await this.listFlat(resolved, resolved)

        const serialized = JSON.stringify(entries)

        if (serialized.length > MAX_OUTPUT_LENGTH) {
            throw new AgentToolError(
                `Directory listing is too large (${serialized.length} chars, limit is ${MAX_OUTPUT_LENGTH}). Try one of the following: list a more specific subdirectory, use non-recursive mode, or use filesystem_glob_search with a pattern to find specific files.`
            )
        }

        return entries
    }

    private async listFlat(dirPath: string, rootPath: string): Promise<Array<FileSystemEntry>> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        return entries.map(entry => ({
            name: entry.name,
            path: path.relative(rootPath, path.join(dirPath, entry.name)),
            type: entry.isDirectory() ? FILE_SYSTEM_ENTRY_TYPE.DIRECTORY : FILE_SYSTEM_ENTRY_TYPE.FILE
        }))
    }

    private async listRecursive(dirPath: string, rootPath: string): Promise<Array<FileSystemEntry>> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const result: Array<FileSystemEntry> = []

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name)
            const relativePath = path.relative(rootPath, entryPath)

            if (entry.isDirectory()) {
                result.push({
                    name: entry.name,
                    path: relativePath,
                    type: FILE_SYSTEM_ENTRY_TYPE.DIRECTORY,
                    children: await this.listRecursive(entryPath, rootPath)
                })
            } else {
                result.push({
                    name: entry.name,
                    path: relativePath,
                    type: FILE_SYSTEM_ENTRY_TYPE.FILE
                })
            }
        }

        return result
    }
}
