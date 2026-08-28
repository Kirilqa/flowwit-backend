import { writeFile, readFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { MoveTool } from '@tool/implementations/filesystem/MoveTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('MoveTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new MoveTool().name).toBe('filesystem_move')
    })

    it('moves a file, removing it from the source location', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new MoveTool()
        await tool.execute({ source, destination }, 'agent-1', 'session-1')

        expect(await readFile(destination, 'utf-8')).toBe('content')
        await expect(stat(source)).rejects.toThrow()
    })

    it('renames a file within the same directory', async () => {
        const source = join(tempDir, 'old-name.txt')
        const destination = join(tempDir, 'new-name.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new MoveTool()
        await tool.execute({ source, destination }, 'agent-1', 'session-1')

        expect(await readFile(destination, 'utf-8')).toBe('content')
    })

    it('moves a directory including its contents', async () => {
        const sourceDir = join(tempDir, 'source')
        const destinationDir = join(tempDir, 'destination')
        await mkdir(sourceDir, { recursive: true })
        await writeFile(join(sourceDir, 'file.txt'), 'content', 'utf-8')

        const tool = new MoveTool()
        await tool.execute({ source: sourceDir, destination: destinationDir }, 'agent-1', 'session-1')

        expect(await readFile(join(destinationDir, 'file.txt'), 'utf-8')).toBe('content')
        await expect(stat(sourceDir)).rejects.toThrow()
    })

    it('creates missing parent directories at the destination', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'a', 'b', 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new MoveTool()
        await tool.execute({ source, destination }, 'agent-1', 'session-1')

        expect(await readFile(destination, 'utf-8')).toBe('content')
    })

    it('returns a success message containing both paths', async () => {
        const source = join(tempDir, 'source.txt')
        const destination = join(tempDir, 'destination.txt')
        await writeFile(source, 'content', 'utf-8')

        const tool = new MoveTool()
        const result = (await tool.execute({ source, destination }, 'agent-1', 'session-1')) as string

        expect(result).toContain('source.txt')
        expect(result).toContain('destination.txt')
    })

    it('throws when the source does not exist', async () => {
        const tool = new MoveTool()
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

        const tool = new MoveTool(sandboxDir)
        await expect(
            tool.execute({ source: '../escape.txt', destination: 'destination.txt' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError for path traversal on the destination when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)
        await writeFile(join(sandboxDir, 'source.txt'), 'content', 'utf-8')

        const tool = new MoveTool(sandboxDir)
        await expect(
            tool.execute({ source: 'source.txt', destination: '../escape.txt' }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })
})
