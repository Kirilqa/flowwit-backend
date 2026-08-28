import { join } from 'path'
import { writeFile } from 'fs/promises'
import { JsonMCPServerConfigRepository } from '@mcp/repositories/JsonMCPServerConfigRepository'
import { MCPServerConfig } from '@mcp'
import { makeTempDir, removeTempDir } from '../../../../helpers/tempDir'

function httpConfig(name: string, url = 'http://localhost:3000'): MCPServerConfig {
    return { name, type: 'streamable-http', url }
}

function stdioConfig(name: string): MCPServerConfig {
    return { name, type: 'stdio', command: 'node', args: ['server.js'] }
}

describe('JsonMCPServerConfigRepository (integration)', () => {
    let testDir: string
    let filePath: string
    let repository: JsonMCPServerConfigRepository

    beforeEach(async () => {
        testDir = await makeTempDir('mcp-repo-test')
        filePath = join(testDir, 'mcp-servers.json')
        repository = new JsonMCPServerConfigRepository(filePath)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns empty array when file does not exist', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all configs from the file', async () => {
            await repository.create(httpConfig('server-a'))
            await repository.create(stdioConfig('server-b'))

            const all = await repository.findAll()
            expect(all).toHaveLength(2)
        })

        it('includes the name field on each returned config', async () => {
            await repository.create(httpConfig('my-server'))

            const all = await repository.findAll()
            const names = all.map(c => c.name)
            expect(names).toContain('my-server')
        })
    })

    describe('findById()', () => {
        it('returns null when file does not exist', async () => {
            expect(await repository.findById('missing')).toBeNull()
        })

        it('returns null for a non-existent key', async () => {
            await repository.create(httpConfig('existing'))
            expect(await repository.findById('missing')).toBeNull()
        })

        it('returns the config with name set', async () => {
            await repository.create(httpConfig('target', 'http://example.com'))
            const found = await repository.findById('target')

            expect(found?.name).toBe('target')
            expect(found?.type).toBe('streamable-http')
        })

        it('preserves all fields on http config', async () => {
            const config: MCPServerConfig = {
                name: 'with-headers',
                type: 'sse',
                url: 'http://example.com/sse',
                headers: { Authorization: 'Bearer token' }
            }
            await repository.create(config)
            const found = await repository.findById('with-headers')

            expect(found).toMatchObject({ type: 'sse', url: 'http://example.com/sse' })
        })

        it('preserves all fields on stdio config', async () => {
            const config: MCPServerConfig = {
                name: 'cli-server',
                type: 'stdio',
                command: 'python',
                args: ['-m', 'server'],
                env: { DEBUG: '1' }
            }
            await repository.create(config)
            const found = await repository.findById('cli-server')

            expect(found).toMatchObject({ command: 'python', args: ['-m', 'server'] })
        })
    })

    describe('create()', () => {
        it('returns the created config', async () => {
            const config = httpConfig('new-server')
            const result = await repository.create(config)

            expect(result.name).toBe('new-server')
        })

        it('overwrites an existing entry with the same name', async () => {
            await repository.create(httpConfig('dupe', 'http://old.com'))
            await repository.create(httpConfig('dupe', 'http://new.com'))

            const found = await repository.findById('dupe')
            expect(found).toMatchObject({ url: 'http://new.com' })
        })

        it('persists multiple configs independently', async () => {
            await repository.create(httpConfig('a'))
            await repository.create(stdioConfig('b'))

            expect(await repository.findById('a')).not.toBeNull()
            expect(await repository.findById('b')).not.toBeNull()
        })
    })

    describe('update()', () => {
        it('applies a partial update to an existing config', async () => {
            await repository.create(httpConfig('upd', 'http://old.com'))
            const result = await repository.update('upd', { url: 'http://new.com' })

            expect(result).toMatchObject({ name: 'upd', url: 'http://new.com' })
        })

        it('persists the updated config to disk', async () => {
            await repository.create(httpConfig('saved', 'http://before.com'))
            await repository.update('saved', { url: 'http://after.com' })

            const found = await repository.findById('saved')
            expect(found).toMatchObject({ url: 'http://after.com' })
        })

        it('throws when the config does not exist', async () => {
            await expect(repository.update('missing', { url: 'http://x.com' })).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the config from the store', async () => {
            await repository.create(httpConfig('to-delete'))
            await repository.delete('to-delete')

            expect(await repository.findById('to-delete')).toBeNull()
        })

        it('excludes deleted config from findAll results', async () => {
            await repository.create(httpConfig('keep'))
            await repository.create(httpConfig('remove'))
            await repository.delete('remove')

            const all = await repository.findAll()
            expect(all).toHaveLength(1)
            expect(all[0]?.name).toBe('keep')
        })

        it('is a no-op when the key does not exist', async () => {
            await repository.create(httpConfig('keep'))
            await repository.delete('non-existent')

            expect(await repository.findAll()).toHaveLength(1)
        })
    })

    describe('invalid file handling', () => {
        it('throws when the file contains invalid JSON', async () => {
            await writeFile(filePath, 'not json', 'utf-8')
            await expect(repository.findAll()).rejects.toThrow('Failed to parse JSON')
        })

        it('throws when the file contains valid JSON but invalid schema', async () => {
            await writeFile(filePath, JSON.stringify({ server: 'not-an-object' }), 'utf-8')
            await expect(repository.findAll()).rejects.toThrow('Invalid config file')
        })
    })
})
