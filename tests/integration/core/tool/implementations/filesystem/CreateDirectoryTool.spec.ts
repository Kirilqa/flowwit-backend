import { stat, mkdir } from 'fs/promises'
import { join } from 'path'
import { CreateDirectoryTool } from '@tool/implementations/filesystem/CreateDirectoryTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('CreateDirectoryTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new CreateDirectoryTool().name).toBe('filesystem_create_directory')
    })

    it('creates a directory', async () => {
        const dirPath = join(tempDir, 'new-dir')
        const tool = new CreateDirectoryTool()

        await tool.execute({ path: dirPath }, 'agent-1', 'session-1')

        expect((await stat(dirPath)).isDirectory()).toBe(true)
    })

    it('creates all missing parent directories', async () => {
        const dirPath = join(tempDir, 'a', 'b', 'c')
        const tool = new CreateDirectoryTool()

        await tool.execute({ path: dirPath }, 'agent-1', 'session-1')

        expect((await stat(dirPath)).isDirectory()).toBe(true)
    })

    it('does not throw when the directory already exists', async () => {
        const dirPath = join(tempDir, 'existing')
        await mkdir(dirPath)

        const tool = new CreateDirectoryTool()
        await expect(tool.execute({ path: dirPath }, 'agent-1', 'session-1')).resolves.not.toThrow()
    })

    it('returns a success message containing the path', async () => {
        const dirPath = join(tempDir, 'new-dir')
        const tool = new CreateDirectoryTool()

        const result = (await tool.execute({ path: dirPath }, 'agent-1', 'session-1')) as string
        expect(result).toContain('new-dir')
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new CreateDirectoryTool(sandboxDir)
        await expect(tool.execute({ path: '../escape-dir' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
