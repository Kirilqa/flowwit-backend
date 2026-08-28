import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { CopyTool } from '@tool/implementations/filesystem/CopyTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('CopyTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new CopyTool().name).toBe('filesystem_copy')
    })

    it('copies a file, leaving the source intact', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new CopyTool()
        await tool.execute({ source, destination }, 'agent-1', 'session-1')

        expect(await readFile(destination, 'utf-8')).toBe('content')
        expect(await readFile(source, 'utf-8')).toBe('content')
    })

    it('copies a directory recursively including its contents', async () => {
        const sourceDir = join(tempDir, 'source')
        const destinationDir = join(tempDir, 'destination')
        await mkdir(join(sourceDir, 'nested'), { recursive: true })
        await writeFile(join(sourceDir, 'nested', 'file.txt'), 'nested content', 'utf-8')

        const tool = new CopyTool()
        await tool.execute({ source: sourceDir, destination: destinationDir }, 'agent-1', 'session-1')

        expect(await readFile(join(destinationDir, 'nested', 'file.txt'), 'utf-8')).toBe('nested content')
    })

    it('creates missing parent directories at the destination', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'a', 'b', 'c', 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new CopyTool()
        await tool.execute({ source, destination }, 'agent-1', 'session-1')

        expect(await readFile(destination, 'utf-8')).toBe('content')
    })

    it('returns a success message containing both paths', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new CopyTool()
        const result = (await tool.execute({ source, destination }, 'agent-1', 'session-1')) as string

        expect(result).toContain('source.txt')
        expect(result).toContain('destination.txt')
    })

    it('throws when the source does not exist', async () => {
        const tool = new CopyTool()
        await expect(
            tool.execute(
                { source: join(tempDir, 'missing.txt'), destination: join(tempDir, 'destination.txt') },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal on the source when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new CopyTool(sandboxDir)
        await expect(
            tool.execute({ source: '../escape.txt', destination: 'destination.txt' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for path traversal on the destination when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)
        await writeFile(join(sandboxDir, 'source.txt'), 'content', 'utf-8')

        const tool = new CopyTool(sandboxDir)
        await expect(
            tool.execute({ source: 'source.txt', destination: '../escape.txt' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
