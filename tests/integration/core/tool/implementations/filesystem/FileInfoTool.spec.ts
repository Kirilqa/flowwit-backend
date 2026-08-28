import { writeFile, mkdir, chmod } from 'fs/promises'
import { join } from 'path'
import { FileInfoTool } from '@tool/implementations/filesystem/FileInfoTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { FILE_SYSTEM_ENTRY_TYPE } from '@tool/implementations/filesystem/types'
import { FileInfo } from '@tool/implementations/filesystem/types/FileInfo'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('FileInfoTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new FileInfoTool().name).toBe('filesystem_file_info')
    })

    it('reports type FILE and correct size for a file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'hello', 'utf-8')

        const tool = new FileInfoTool()
        const info = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as FileInfo

        expect(info.type).toBe(FILE_SYSTEM_ENTRY_TYPE.FILE)
        expect(info.size).toBe(5)
        expect(info.path).toBe(filePath)
    })

    it('reports type DIRECTORY for a directory', async () => {
        const dirPath = join(tempDir, 'sub')
        await mkdir(dirPath)

        const tool = new FileInfoTool()
        const info = (await tool.execute({ path: dirPath }, 'agent-1', 'session-1')) as FileInfo

        expect(info.type).toBe(FILE_SYSTEM_ENTRY_TYPE.DIRECTORY)
    })

    it('includes ISO timestamps for created, modified and accessed', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'hello', 'utf-8')

        const tool = new FileInfoTool()
        const info = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as FileInfo

        expect(() => new Date(info.createdAt).toISOString()).not.toThrow()
        expect(() => new Date(info.modifiedAt).toISOString()).not.toThrow()
        expect(() => new Date(info.accessedAt).toISOString()).not.toThrow()
    })

    it('reports isReadonly as false for a normal writable file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'hello', 'utf-8')

        const tool = new FileInfoTool()
        const info = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as FileInfo

        expect(info.isReadonly).toBe(false)
    })

    it('reports isReadonly as true for a readonly file', async () => {
        const filePath = join(tempDir, 'readonly.txt')
        await writeFile(filePath, 'hello', 'utf-8')
        await chmod(filePath, 0o444)

        try {
            const tool = new FileInfoTool()
            const info = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as FileInfo

            expect(info.isReadonly).toBe(true)
        } finally {
            await chmod(filePath, 0o666)
        }
    })

    it('throws when the path does not exist', async () => {
        const tool = new FileInfoTool()
        await expect(tool.execute({ path: join(tempDir, 'missing') }, 'agent-1', 'session-1')).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new FileInfoTool(sandboxDir)
        await expect(tool.execute({ path: '../secret.txt' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
