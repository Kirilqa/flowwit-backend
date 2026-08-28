import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { GlobSearchTool } from '@tool/implementations/filesystem/GlobSearchTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('GlobSearchTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new GlobSearchTool().name).toBe('filesystem_glob_search')
    })

    it('returns a "no files found" message when nothing matches', async () => {
        const tool = new GlobSearchTool()
        const result = await tool.execute({ pattern: '**/*.nonexistent' }, 'agent-1', 'session-1', tempDir)
        expect(result).toBe('No files found matching pattern "**/*.nonexistent"')
    })

    it('finds files matching the pattern using the given cwd', async () => {
        await writeFile(join(tempDir, 'a.ts'), '', 'utf-8')
        await writeFile(join(tempDir, 'b.js'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*.ts', cwd: tempDir }, 'agent-1', 'session-1')) as string

        expect(result).toContain('a.ts')
        expect(result).not.toContain('b.js')
    })

    it('falls back to workingDirectory when no cwd is passed', async () => {
        await writeFile(join(tempDir, 'a.ts'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*.ts' }, 'agent-1', 'session-1', tempDir)) as string

        expect(result).toContain('a.ts')
    })

    it('falls back to rootDirectory when neither cwd nor workingDirectory is given', async () => {
        await writeFile(join(tempDir, 'a.ts'), '', 'utf-8')

        const tool = new GlobSearchTool(tempDir)
        const result = (await tool.execute({ pattern: '*.ts' }, 'agent-1', 'session-1')) as string

        expect(result).toContain('a.ts')
    })

    it('falls back to process.cwd() when no cwd, workingDirectory or rootDirectory is given', async () => {
        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: 'package.json' }, 'agent-1', 'session-1')) as string

        expect(result).toContain('package.json')
    })

    it('excludes node_modules by default', async () => {
        await mkdir(join(tempDir, 'node_modules'), { recursive: true })
        await writeFile(join(tempDir, 'node_modules', 'lib.ts'), '', 'utf-8')
        await writeFile(join(tempDir, 'app.ts'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '**/*.ts', cwd: tempDir }, 'agent-1', 'session-1')) as string

        expect(result).toContain('app.ts')
        expect(result).not.toContain('lib.ts')
    })

    it('applies additional custom ignore patterns', async () => {
        await writeFile(join(tempDir, 'keep.ts'), '', 'utf-8')
        await writeFile(join(tempDir, 'skip.ts'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute(
            { pattern: '*.ts', cwd: tempDir, ignore: ['skip.ts'] },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('keep.ts')
        expect(result).not.toContain('skip.ts')
    })

    it('returns only files when onlyFiles is true (default)', async () => {
        await mkdir(join(tempDir, 'subdir'))
        await writeFile(join(tempDir, 'file.txt'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*', cwd: tempDir }, 'agent-1', 'session-1')) as string

        expect(result).toContain('file.txt')
        expect(result).not.toContain('subdir')
    })

    it('includes directories when onlyFiles is false', async () => {
        await mkdir(join(tempDir, 'subdir'))

        const tool = new GlobSearchTool()
        const result = (await tool.execute(
            { pattern: '*', cwd: tempDir, onlyFiles: false },
            'agent-1',
            'session-1'
        )) as string

        expect(result).toContain('subdir')
    })

    it('excludes dot-files by default', async () => {
        await writeFile(join(tempDir, '.hidden'), '', 'utf-8')
        await writeFile(join(tempDir, 'visible.txt'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*', cwd: tempDir }, 'agent-1', 'session-1')) as string

        expect(result).toContain('visible.txt')
        expect(result).not.toContain('.hidden')
    })

    it('includes dot-files when dot is true', async () => {
        await writeFile(join(tempDir, '.hidden'), '', 'utf-8')

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*', cwd: tempDir, dot: true }, 'agent-1', 'session-1')) as string

        expect(result).toContain('.hidden')
    })

    it('reports the total match count and caps output at MAX_RESULTS with a truncation notice', async () => {
        for (let i = 0; i < 510; i++) {
            await writeFile(join(tempDir, `f${i}.txt`), '', 'utf-8')
        }

        const tool = new GlobSearchTool()
        const result = (await tool.execute({ pattern: '*.txt', cwd: tempDir }, 'agent-1', 'session-1')) as string

        expect(result).toContain('Found 510 matches')
        expect(result).toContain('showing first 500')
    }, 30_000)

    it('throws AgentToolError when the formatted output exceeds the output length limit', async () => {
        const longNamePrefix = 'x'.repeat(80)
        for (let i = 0; i < 500; i++) {
            await writeFile(join(tempDir, `${longNamePrefix}-${i}.txt`), '', 'utf-8')
        }

        const tool = new GlobSearchTool()
        await expect(tool.execute({ pattern: '*.txt', cwd: tempDir }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    }, 30_000)

    it('throws AgentToolError for path traversal when cwd is given with rootDirectory set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new GlobSearchTool(sandboxDir)
        await expect(tool.execute({ pattern: '*', cwd: '..' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
