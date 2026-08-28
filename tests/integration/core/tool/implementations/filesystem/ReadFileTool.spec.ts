import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ReadFileTool } from '@tool/implementations/filesystem/ReadFileTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('ReadFileTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new ReadFileTool().name).toBe('filesystem_read_file')
    })

    it('reads file content as a string', async () => {
        const filePath = join(tempDir, 'hello.txt')
        await writeFile(filePath, 'Hello, world!', 'utf-8')

        const tool = new ReadFileTool()
        const result = await tool.execute({ path: filePath }, 'agent-1', 'session-1')
        expect(result).toBe('Hello, world!')
    })

    it('reads file using workingDirectory and relative path', async () => {
        const filePath = join(tempDir, 'data.txt')
        await writeFile(filePath, 'relative read', 'utf-8')

        const tool = new ReadFileTool()
        const result = await tool.execute({ path: 'data.txt' }, 'agent-1', 'session-1', tempDir)
        expect(result).toBe('relative read')
    })

    it('reads file using rootDirectory constructor param and relative path', async () => {
        const filePath = join(tempDir, 'root.txt')
        await writeFile(filePath, 'root read', 'utf-8')

        const tool = new ReadFileTool(tempDir)
        const result = await tool.execute({ path: 'root.txt' }, 'agent-1', 'session-1')
        expect(result).toBe('root read')
    })

    it('throws AgentToolError when file does not exist', async () => {
        const tool = new ReadFileTool()
        await expect(tool.execute({ path: join(tempDir, 'missing.txt') }, 'agent-1', 'session-1')).rejects.toThrow()
    })

    it('throws AgentToolError when file exceeds 40k character limit', async () => {
        const filePath = join(tempDir, 'big.txt')
        await writeFile(filePath, 'x'.repeat(40_001), 'utf-8')

        const tool = new ReadFileTool()
        await expect(tool.execute({ path: filePath }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('reads a file that is exactly 40k characters without throwing', async () => {
        const filePath = join(tempDir, 'exact.txt')
        await writeFile(filePath, 'x'.repeat(40_000), 'utf-8')

        const tool = new ReadFileTool()
        const result = (await tool.execute({ path: filePath }, 'agent-1', 'session-1')) as string
        expect(result.length).toBe(40_000)
    })

    it('throws AgentToolError for path traversal when workingDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)
        const outsideFile = join(tempDir, 'secret.txt')
        await writeFile(outsideFile, 'secret', 'utf-8')

        const tool = new ReadFileTool()
        await expect(tool.execute({ path: '../secret.txt' }, 'agent-1', 'session-1', sandboxDir)).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)
        const outsideFile = join(tempDir, 'secret.txt')
        await writeFile(outsideFile, 'secret', 'utf-8')

        const tool = new ReadFileTool(sandboxDir)
        await expect(tool.execute({ path: '../secret.txt' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('allows reading files within sandbox subdirectory', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        const subDir = join(sandboxDir, 'sub')
        await mkdir(subDir, { recursive: true })
        const filePath = join(subDir, 'nested.txt')
        await writeFile(filePath, 'nested content', 'utf-8')

        const tool = new ReadFileTool(sandboxDir)
        const result = await tool.execute({ path: 'sub/nested.txt' }, 'agent-1', 'session-1')
        expect(result).toBe('nested content')
    })
})
