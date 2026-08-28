import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { DeleteTool } from '@tool/implementations/filesystem/DeleteTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('DeleteTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new DeleteTool().name).toBe('filesystem_delete')
    })

    it('deletes a file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'content', 'utf-8')

        const tool = new DeleteTool()
        await tool.execute({ path: filePath }, 'agent-1', 'session-1')

        await expect(stat(filePath)).rejects.toThrow()
    })

    it('deletes a directory and all of its contents recursively', async () => {
        const dirPath = join(tempDir, 'sub')
        await mkdir(join(dirPath, 'nested'), { recursive: true })
        await writeFile(join(dirPath, 'nested', 'file.txt'), 'content', 'utf-8')

        const tool = new DeleteTool()
        await tool.execute({ path: dirPath }, 'agent-1', 'session-1')

        await expect(stat(dirPath)).rejects.toThrow()
    })

    it('returns a success message containing the path', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'content', 'utf-8')

        const tool = new DeleteTool()
        const result = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as string
        expect(result).toContain('file.txt')
    })

    it('throws when the path does not exist', async () => {
        const tool = new DeleteTool()
        await expect(tool.execute({ path: join(tempDir, 'missing') }, 'agent-1', 'session-1')).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new DeleteTool(sandboxDir)
        await expect(tool.execute({ path: '../escape.txt' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
