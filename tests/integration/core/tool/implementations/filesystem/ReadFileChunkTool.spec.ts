import { writeFile } from 'fs/promises'
import { join } from 'path'
import { ReadFileChunkTool } from '@tool/implementations/filesystem/ReadFileChunkTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('ReadFileChunkTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new ReadFileChunkTool().name).toBe('filesystem_read_file_chunk')
    })

    it('reads a range of lines with 1-based line numbers prefixed', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree\nfour\nfive', 'utf-8')

        const tool = new ReadFileChunkTool()
        const result = await tool.execute({ path: filePath, fromLine: 2, toLine: 4 }, 'agent-1', 'session-1')

        expect(result).toBe('2: two\n3: three\n4: four')
    })

    it('reads a single line when fromLine equals toLine', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new ReadFileChunkTool()
        const result = await tool.execute({ path: filePath, fromLine: 1, toLine: 1 }, 'agent-1', 'session-1')

        expect(result).toBe('1: one')
    })

    it('clamps toLine to the last line when it exceeds the file length', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new ReadFileChunkTool()
        const result = await tool.execute({ path: filePath, fromLine: 2, toLine: 100 }, 'agent-1', 'session-1')

        expect(result).toBe('2: two\n3: three')
    })

    it('throws AgentToolError when fromLine is greater than toLine', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo', 'utf-8')

        const tool = new ReadFileChunkTool()
        await expect(tool.execute({ path: filePath, fromLine: 2, toLine: 1 }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when fromLine is beyond the end of the file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo', 'utf-8')

        const tool = new ReadFileChunkTool()
        await expect(
            tool.execute({ path: filePath, fromLine: 10, toLine: 10 }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws when the file does not exist', async () => {
        const tool = new ReadFileChunkTool()
        await expect(
            tool.execute({ path: join(tempDir, 'missing.txt'), fromLine: 1, toLine: 1 }, 'agent-1', 'session-1')
        ).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        const tool = new ReadFileChunkTool(sandboxDir)
        await expect(
            tool.execute({ path: '../escape.txt', fromLine: 1, toLine: 1 }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
