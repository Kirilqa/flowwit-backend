import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ListDirectoryTool } from '@tool/implementations/filesystem/ListDirectoryTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { FileSystemEntry, FILE_SYSTEM_ENTRY_TYPE } from '@tool/implementations/filesystem/types'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('ListDirectoryTool', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('fs-tools-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('has correct name', () => {
        expect(new ListDirectoryTool().name).toBe('filesystem_list_directory')
    })

    it('lists immediate files and directories, non-recursively by default', async () => {
        await writeFile(join(tempDir, 'a.txt'), 'a', 'utf-8')
        await mkdir(join(tempDir, 'sub'))
        await writeFile(join(tempDir, 'sub', 'nested.txt'), 'nested', 'utf-8')

        const tool = new ListDirectoryTool()
        const entries = (await tool.execute({ path: tempDir }, 'agent-1', 'session-1')) as Array<FileSystemEntry>

        const names = entries.map(e => e.name).sort()
        expect(names).toEqual(['a.txt', 'sub'])
        const subEntry = entries.find(e => e.name === 'sub')
        expect(subEntry?.type).toBe(FILE_SYSTEM_ENTRY_TYPE.DIRECTORY)
        expect(subEntry?.children).toBeUndefined()
    })

    it('sets file type correctly for a plain file entry', async () => {
        await writeFile(join(tempDir, 'a.txt'), 'a', 'utf-8')

        const tool = new ListDirectoryTool()
        const entries = (await tool.execute({ path: tempDir }, 'agent-1', 'session-1')) as Array<FileSystemEntry>

        expect(entries[0]?.type).toBe(FILE_SYSTEM_ENTRY_TYPE.FILE)
        expect(entries[0]?.path).toBe('a.txt')
    })

    it('recurses into subdirectories when recursive is true', async () => {
        await mkdir(join(tempDir, 'sub'))
        await writeFile(join(tempDir, 'sub', 'nested.txt'), 'nested', 'utf-8')

        const tool = new ListDirectoryTool()
        const entries = (await tool.execute(
            { path: tempDir, recursive: true },
            'agent-1',
            'session-1'
        )) as Array<FileSystemEntry>

        const subEntry = entries.find(e => e.name === 'sub')
        expect(subEntry?.children).toHaveLength(1)
        expect(subEntry?.children?.[0]).toMatchObject({ name: 'nested.txt', path: join('sub', 'nested.txt') })
    })

    it('returns an empty array for an empty directory', async () => {
        const tool = new ListDirectoryTool()
        const entries = await tool.execute({ path: tempDir }, 'agent-1', 'session-1')
        expect(entries).toEqual([])
    })

    it('throws AgentToolError when the serialized listing exceeds the output limit', async () => {
        const tool = new ListDirectoryTool()
        for (let i = 0; i < 2000; i++) {
            await writeFile(join(tempDir, `file-with-a-fairly-long-name-${i}.txt`), '', 'utf-8')
        }

        await expect(tool.execute({ path: tempDir }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    }, 30_000)

    it('throws when the directory does not exist', async () => {
        const tool = new ListDirectoryTool()
        await expect(tool.execute({ path: join(tempDir, 'missing') }, 'agent-1', 'session-1')).rejects.toThrow()
    })

    it('throws AgentToolError for path traversal when rootDirectory is set', async () => {
        const sandboxDir = join(tempDir, 'sandbox')
        await mkdir(sandboxDir)

        const tool = new ListDirectoryTool(sandboxDir)
        await expect(tool.execute({ path: '..' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
