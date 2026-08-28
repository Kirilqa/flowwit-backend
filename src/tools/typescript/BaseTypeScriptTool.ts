import path from 'path'
import { Project, SourceFile } from 'ts-morph'
import { ZodObject, ZodRawShape } from 'zod'
import { BaseTool, AgentToolError } from '@tool'
import { findTsconfig } from './utils/findTsconfig'

export abstract class BaseTypeScriptTool<TSchema extends ZodObject<ZodRawShape>> extends BaseTool<TSchema> {
    private readonly project: Project

    constructor() {
        super()
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
            skipFileDependencyResolution: true
        })
    }

    protected getSourceFile(filePath: string): SourceFile {
        const existing = this.project.getSourceFile(filePath)

        if (existing) {
            existing.refreshFromFileSystemSync()
            return existing
        }

        try {
            return this.project.addSourceFileAtPath(filePath)
        } catch {
            throw new AgentToolError(`Cannot read TypeScript file at path "${filePath}"`)
        }
    }

    protected async createProject(
        filePath: string,
        tsconfigPath?: string
    ): Promise<{ project: Project; resolvedTsconfigPath: string | null }> {
        const resolvedFilePath = path.resolve(filePath)
        const resolvedTsconfigPath = tsconfigPath ? path.resolve(tsconfigPath) : await findTsconfig(resolvedFilePath)

        const project = resolvedTsconfigPath
            ? new Project({ tsConfigFilePath: resolvedTsconfigPath })
            : new Project({ skipAddingFilesFromTsConfig: true })

        return { project, resolvedTsconfigPath }
    }

    protected addSourceFileToProject(project: Project, filePath: string): SourceFile {
        try {
            return project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath)
        } catch {
            throw new AgentToolError(`Cannot read TypeScript file at path "${filePath}"`)
        }
    }

    protected formatLineRange(startLine: number, endLine: number): string {
        return `${startLine}–${endLine}`
    }
}
