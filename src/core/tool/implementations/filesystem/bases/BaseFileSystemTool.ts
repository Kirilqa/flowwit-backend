import path from 'path'
import { ZodObject, ZodRawShape } from 'zod'
import { AgentToolError } from '../../../errors'
import { BaseTool } from '../../bases/BaseTool'

export abstract class BaseFileSystemTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    protected readonly rootDirectory: string | null

    constructor(rootDirectory?: string) {
        super()
        this.rootDirectory = rootDirectory ? path.resolve(rootDirectory) : null
    }

    protected resolvePath(filePath: string, directory?: string): string {
        const resultDirectory = directory ?? this.rootDirectory
        const resolved = resultDirectory ? path.resolve(resultDirectory, filePath) : path.resolve(filePath)

        if (resultDirectory && !resolved.startsWith(resultDirectory + path.sep) && resolved !== resultDirectory) {
            throw new AgentToolError(`Path "${filePath}" is outside of the allowed root directory "${resultDirectory}"`)
        }

        return resolved
    }
}
