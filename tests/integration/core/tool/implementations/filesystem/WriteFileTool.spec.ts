import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { WriteFileTool } from '@tool/implementations/filesystem/WriteFileTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('WriteFileTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new WriteFileTool().name).toBe('filesystem_write_file')
    })

    it('writes content to a new file', async () => {
        const filePath = join(tempDir, 'output.txt')
        const tool = new WriteFileTool()

        await tool.execute({ path: filePath, content: 'written content' }, 'agent-1', 'session-1')

        const actual = await readFile(filePath, 'utf-8')
        expect(actual).toBe('written content')
    })

    it('returns a success message containing the path', async () => {
        const filePath = join(tempDir, 'output.txt')
        const tool = new WriteFileTool()

        const result = (await tool.execute({ path: filePath, content: '' }, 'agent-1', 'session-1')) as string
        expect(result).toContain('output.txt')
    })

    it('overwrites an existing file', async () => {
        const filePath = join(tempDir, 'overwrite.txt')
        await writeFile(filePath, 'original', 'utf-8')

        const tool = new WriteFileTool()
        await tool.execute({ path: filePath, content: 'updated' }, 'agent-1', 'session-1')

        const actual = await readFile(filePath, 'utf-8')
        expect(actual).toBe('updated')
    })

    it('creates missing parent directories', async () => {
        const filePath = join(tempDir, 'a', 'b', 'c', 'deep.txt')
        const tool = new WriteFileTool()

        await tool.execute({ path: filePath, content: 'deep' }, 'agent-1', 'session-1')

        const actual = await readFile(filePath, 'utf-8')
        expect(actual).toBe('deep')
    })

    it('writes using workingDirectory and relative path', async () => {
        const tool = new WriteFileTool()
        await tool.execute({ path: 'relative.txt', content: 'hello' }, 'agent-1', 'session-1', tempDir)

        const actual = await readFile(join(tempDir, 'relative.txt'), 'utf-8')
        expect(actual).toBe('hello')
    })

    it('throws AgentToolError for path traversal when workingDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new WriteFileTool()
        await expect(
            tool.execute({ path: '../escape.txt', content: 'escape' }, 'agent-1', 'session-1', sandboxDir)
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new WriteFileTool(sandboxDir)
        await expect(
            tool.execute({ path: '../escape.txt', content: 'escape' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('writes empty content', async () => {
        const filePath = join(tempDir, 'empty.txt')
        const tool = new WriteFileTool()

        await tool.execute({ path: filePath, content: '' }, 'agent-1', 'session-1')

        const actual = await readFile(filePath, 'utf-8')
        expect(actual).toBe('')
    })
})
