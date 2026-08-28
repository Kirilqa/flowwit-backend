import { writeFile } from 'fs/promises'
import { join } from 'path'
import { SearchInFileTool } from '@tool/implementations/filesystem/SearchInFileTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('SearchInFileTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new SearchInFileTool().name).toBe('filesystem_search_in_file')
    })

    it('returns a "no matches" message when the query is not found', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'line one\nline two\nline three', 'utf-8')

        const tool = new SearchInFileTool()
        const result = await tool.execute({ path: filePath, query: 'nope' }, 'agent-1', 'session-1')
        expect(result).toBe('No matches found for "nope"')
    })

    it('finds a plain string match and reports the line number', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'line one\nline two\nline three', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute({ path: filePath, query: 'two' }, 'agent-1', 'session-1')) as string
        expect(result).toContain('Found 1 match:')
        expect(result).toContain('> 2: line two')
    })

    it('reports plural count for multiple matches', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'foo\nfoo\nfoo', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute({ path: filePath, query: 'foo' }, 'agent-1', 'session-1')) as string
        expect(result).toContain('Found 3 matches:')
    })

    it('includes contextLines before and after each match', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'a\nb\ntarget\nc\nd', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute(
            { path: filePath, query: 'target', contextLines: 1 },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('  2: b')
        expect(result).toContain('> 3: target')
        expect(result).toContain('  4: c')
        expect(result).not.toContain('1: a')
        expect(result).not.toContain('5: d')
    })

    it('defaults contextLines to 2 when not provided', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'a\nb\ntarget\nc\nd', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute({ path: filePath, query: 'target' }, 'agent-1', 'session-1')) as string

        expect(result).toContain('  1: a')
        expect(result).toContain('  5: d')
    })

    it('clamps context at the start and end of the file', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'target\nb', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute(
            { path: filePath, query: 'target', contextLines: 5 },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('> 1: target')
        expect(result).toContain('  2: b')
    })

    it('treats the query as a literal string by default, escaping regex special characters', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'price: $5.00\nprice: $5x00', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute({ path: filePath, query: '$5.00' }, 'agent-1', 'session-1')) as string
        expect(result).toContain('Found 1 match:')
        expect(result).toContain('$5.00')
    })

    it('treats the query as a regex when isRegex is true', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'foo123\nbar\nfoo456', 'utf-8')

        const tool = new SearchInFileTool()
        const result = (await tool.execute(
            { path: filePath, query: 'foo\\d+', isRegex: true },
            'agent-1',
            'session-1'
        )) as string
        expect(result).toContain('Found 2 matches:')
    })

    it('throws AgentToolError for an invalid regex pattern', async () => {
        const filePath = join(tempDir, 'file.txt')
        await writeFile(filePath, 'content', 'utf-8')

        const tool = new SearchInFileTool()
        await expect(
            tool.execute({ path: filePath, query: '(unclosed', isRegex: true }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws when the file does not exist', async () => {
        const tool = new SearchInFileTool()
        await expect(
            tool.execute({ path: join(tempDir, 'missing.txt'), query: 'x' }, 'agent-1', 'session-1')
        ).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const outsideFile = join(tempDir, 'secret.txt')
        await writeFile(outsideFile, 'secret', 'utf-8')
        const sandboxDir = join(tempDir, 'sandbox')

        const tool = new SearchInFileTool(sandboxDir)
        await expect(tool.execute({ path: '../secret.txt', query: 'secret' }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })
})
