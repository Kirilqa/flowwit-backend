import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { PatchFileTool } from '@tool/implementations/filesystem/PatchFileTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('PatchFileTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new PatchFileTool().name).toBe('filesystem_patch_file')
    })

    it('replaces a single line', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new PatchFileTool()
        await tool.execute({ path: filePath, fromLine: 2, toLine: 2, content: 'TWO' }, 'agent-1', 'session-1')

        expect(await readFile(filePath, 'utf-8')).toBe('one\nTWO\nthree')
    })

    it('replaces a range of lines with fewer replacement lines', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree\nfour', 'utf-8')

        const tool = new PatchFileTool()
        await tool.execute({ path: filePath, fromLine: 2, toLine: 3, content: 'REPLACED' }, 'agent-1', 'session-1')

        expect(await readFile(filePath, 'utf-8')).toBe('one\nREPLACED\nfour')
    })

    it('replaces a range with a multi-line replacement', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new PatchFileTool()
        await tool.execute({ path: filePath, fromLine: 2, toLine: 2, content: 'a\nb\nc' }, 'agent-1', 'session-1')

        expect(await readFile(filePath, 'utf-8')).toBe('one\na\nb\nc\nthree')
    })

    it('clamps toLine to the last line when it exceeds the file length', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new PatchFileTool()
        await tool.execute({ path: filePath, fromLine: 2, toLine: 100, content: 'END' }, 'agent-1', 'session-1')

        expect(await readFile(filePath, 'utf-8')).toBe('one\nEND')
    })

    it('returns a summary message with the replaced line count', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo\nthree', 'utf-8')

        const tool = new PatchFileTool()
        const result = (await tool.execute(
            { path: filePath, fromLine: 1, toLine: 2, content: 'x' },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('replaced 2 lines')
        expect(result).toContain('1–2')
    })

    it('uses singular wording when exactly one line is replaced', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo', 'utf-8')

        const tool = new PatchFileTool()
        const result = (await tool.execute(
            { path: filePath, fromLine: 1, toLine: 1, content: 'x' },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('replaced 1 line ')
    })

    it('throws AgentToolError when fromLine is greater than toLine', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo', 'utf-8')

        const tool = new PatchFileTool()
        await expect(
            tool.execute({ path: filePath, fromLine: 3, toLine: 1, content: 'x' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when fromLine is beyond the end of the file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'one\ntwo', 'utf-8')

        const tool = new PatchFileTool()
        await expect(
            tool.execute({ path: filePath, fromLine: 10, toLine: 10, content: 'x' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws when the file does not exist', async () => {
        const tool = new PatchFileTool()
        await expect(
            tool.execute(
                { path: join(tempDir, 'missing.txt'), fromLine: 1, toLine: 1, content: 'x' },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        const tool = new PatchFileTool(sandboxDir)
        await expect(
            tool.execute({ path: '../escape.txt', fromLine: 1, toLine: 1, content: 'x' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
