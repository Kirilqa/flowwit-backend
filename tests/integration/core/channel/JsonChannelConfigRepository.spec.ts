import { writeFile } from 'fs/promises'
import { join } from 'path'
import { JsonChannelConfigRepository } from '@channel/repositories/JsonChannelConfigRepository'
import { ChannelConfig } from '@channel/types/ChannelConfig'
import { makeTempDir, removeTempDir } from '../../../helpers/tempDir'

describe('JsonChannelConfigRepository', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('channel-config-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    describe('findAll()', () => {
        it('returns empty array when file does not exist', async () => {
            const repo = new JsonChannelConfigRepository(join(tempDir, 'missing.json'))
            const result = await repo.findAll()
            expect(result).toEqual([])
        })

        it('returns all configs from file', async () => {
            const filePath = join(tempDir, 'channels.json')
            await writeFile(filePath, JSON.stringify({ web: { token: 'abc' }, telegram: { botToken: 'xyz' } }), 'utf-8')
            const repo = new JsonChannelConfigRepository(filePath)
            const result = await repo.findAll()
            expect(result).toHaveLength(2)
            expect(result.map(r => r.channelId)).toEqual(expect.arrayContaining(['web', 'telegram']))
        })
    })

    describe('findById()', () => {
        it('returns null when file does not exist', async () => {
            const repo = new JsonChannelConfigRepository(join(tempDir, 'missing.json'))
            expect(await repo.findById('web')).toBeNull()
        })

        it('returns null for unknown channelId', async () => {
            const filePath = join(tempDir, 'channels.json')
            await writeFile(filePath, JSON.stringify({ web: { token: 'abc' } }), 'utf-8')
            const repo = new JsonChannelConfigRepository(filePath)
            expect(await repo.findById('telegram')).toBeNull()
        })

        it('returns config for known channelId', async () => {
            const filePath = join(tempDir, 'channels.json')
            await writeFile(filePath, JSON.stringify({ web: { token: 'abc' } }), 'utf-8')
            const repo = new JsonChannelConfigRepository(filePath)
            const result = await repo.findById('web')
            expect(result).toEqual({ channelId: 'web', settings: { token: 'abc' } })
        })

        it('throws when file contains invalid JSON', async () => {
            const filePath = join(tempDir, 'bad.json')
            await writeFile(filePath, '{ not valid', 'utf-8')
            const repo = new JsonChannelConfigRepository(filePath)
            await expect(repo.findById('web')).rejects.toThrow()
        })
    })

    describe('create()', () => {
        it('writes config and can be found back', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)
            const config: ChannelConfig = { channelId: 'web', settings: { token: 'secret' } }

            await repo.create(config)

            const found = await repo.findById('web')
            expect(found).toEqual(config)
        })

        it('returns the created config', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)
            const config: ChannelConfig = { channelId: 'telegram', settings: { botToken: 'tok' } }

            const result = await repo.create(config)
            expect(result).toEqual(config)
        })

        it('overwrites existing entry for same channelId', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'old' } })
            await repo.create({ channelId: 'web', settings: { token: 'new' } })

            const found = await repo.findById('web')
            expect(found?.settings['token']).toBe('new')
        })

        it('does not affect other channels', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'web-tok' } })
            await repo.create({ channelId: 'telegram', settings: { botToken: 'bot-tok' } })

            const web = await repo.findById('web')
            expect(web?.settings['token']).toBe('web-tok')
        })
    })

    describe('update()', () => {
        it('merges patch.settings with existing settings', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'abc', debug: false } })
            await repo.update('web', { settings: { debug: true } })

            const found = await repo.findById('web')
            expect(found?.settings['token']).toBe('abc')
            expect(found?.settings['debug']).toBe(true)
        })

        it('throws when channelId does not exist', async () => {
            const repo = new JsonChannelConfigRepository(join(tempDir, 'channels.json'))
            await expect(repo.update('missing', { settings: {} })).rejects.toThrow()
        })

        it('preserves existing settings unchanged when patch omits settings', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'abc' } })
            await repo.update('web', {})

            const found = await repo.findById('web')
            expect(found?.settings).toEqual({ token: 'abc' })
        })
    })

    describe('delete()', () => {
        it('removes the channel config', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'abc' } })
            await repo.delete('web')

            expect(await repo.findById('web')).toBeNull()
        })

        it('does not affect other channels when deleting', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)

            await repo.create({ channelId: 'web', settings: { token: 'abc' } })
            await repo.create({ channelId: 'telegram', settings: { botToken: 'tok' } })
            await repo.delete('web')

            expect(await repo.findById('telegram')).not.toBeNull()
        })

        it('is a no-op for non-existent channelId', async () => {
            const filePath = join(tempDir, 'channels.json')
            const repo = new JsonChannelConfigRepository(filePath)
            await expect(repo.delete('missing')).resolves.toBeUndefined()
        })
    })
})
