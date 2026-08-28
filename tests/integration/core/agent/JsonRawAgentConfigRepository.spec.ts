import { join } from 'path'
import { writeFile } from 'fs/promises'
import { JsonRawAgentConfigRepository } from '@agent/repositories/JsonRawAgentConfigRepository'
import { LoggerInterface, NoopLogger } from '@logger'
import { makeTempDir, removeTempDir } from '../../../helpers/tempDir'
import { makeRawAgentConfig as makeRawConfig } from '../../../helpers/makeAgent'

describe('JsonRawAgentConfigRepository (integration)', () => {
    let testDir: string
    let filePath: string
    let repository: JsonRawAgentConfigRepository

    beforeEach(async () => {
        testDir = await makeTempDir('raw-agent-config-test')
        filePath = join(testDir, 'agents.json')
        repository = new JsonRawAgentConfigRepository(filePath, new NoopLogger())
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns an empty array when the file does not exist', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all valid agent configs', async () => {
            await writeFile(filePath, JSON.stringify({ agents: [makeRawConfig('a1'), makeRawConfig('a2')] }), 'utf-8')

            const result = await repository.findAll()
            expect(result.map(a => a.id)).toEqual(['a1', 'a2'])
        })

        it('skips an invalid entry and still returns the valid ones', async () => {
            const logger: LoggerInterface = {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                child: jest.fn()
            }
            const repositoryWithMockLogger = new JsonRawAgentConfigRepository(filePath, logger)

            await writeFile(
                filePath,
                JSON.stringify({
                    agents: [makeRawConfig('valid-1'), { id: '', name: 'broken' }, makeRawConfig('valid-2')]
                }),
                'utf-8'
            )

            const result = await repositoryWithMockLogger.findAll()

            expect(result.map(a => a.id)).toEqual(['valid-1', 'valid-2'])
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping invalid agent entry',
                expect.objectContaining({ index: 1 })
            )
        })

        it('throws when the file contains invalid JSON', async () => {
            await writeFile(filePath, '{ not valid json', 'utf-8')
            await expect(repository.findAll()).rejects.toThrow()
        })

        it('throws when the file is missing the agents array', async () => {
            await writeFile(filePath, JSON.stringify({ notAgents: [] }), 'utf-8')
            await expect(repository.findAll()).rejects.toThrow()
        })
    })

    describe('findById()', () => {
        it('returns null for an unknown id', async () => {
            await writeFile(filePath, JSON.stringify({ agents: [makeRawConfig('a1')] }), 'utf-8')
            expect(await repository.findById('missing')).toBeNull()
        })

        it('returns the matching config', async () => {
            await writeFile(filePath, JSON.stringify({ agents: [makeRawConfig('a1')] }), 'utf-8')
            const found = await repository.findById('a1')
            expect(found?.id).toBe('a1')
        })
    })

    describe('create()', () => {
        it('persists a new config and can find it back', async () => {
            const config = makeRawConfig('new-agent')
            await repository.create(config)

            const found = await repository.findById('new-agent')
            expect(found).toEqual(config)
        })

        it('overwrites an existing entry with the same id', async () => {
            await repository.create(makeRawConfig('a1', { model: 'old-model' }))
            await repository.create(makeRawConfig('a1', { model: 'new-model' }))

            const found = await repository.findById('a1')
            expect(found?.model).toBe('new-model')
        })
    })

    describe('update()', () => {
        it('merges the patch into the existing config', async () => {
            await repository.create(makeRawConfig('a1', { model: 'old-model' }))
            await repository.update('a1', { model: 'new-model' })

            const found = await repository.findById('a1')
            expect(found?.model).toBe('new-model')
        })

        it('throws when the id does not exist', async () => {
            await expect(repository.update('missing', { model: 'x' })).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the config and does not affect others', async () => {
            await repository.create(makeRawConfig('a1'))
            await repository.create(makeRawConfig('a2'))

            await repository.delete('a1')

            expect(await repository.findById('a1')).toBeNull()
            expect(await repository.findById('a2')).not.toBeNull()
        })
    })

    describe('ensureInitialized()', () => {
        it('seeds the given agents when the store is empty', async () => {
            await repository.ensureInitialized([makeRawConfig('seed-1'), makeRawConfig('seed-2')])

            const result = await repository.findAll()
            expect(result.map(a => a.id).sort()).toEqual(['seed-1', 'seed-2'])
        })

        it('does nothing when at least one agent already exists', async () => {
            await repository.create(makeRawConfig('existing'))

            await repository.ensureInitialized([makeRawConfig('seed-1')])

            const result = await repository.findAll()
            expect(result.map(a => a.id)).toEqual(['existing'])
        })

        it('does nothing when the seed list is empty', async () => {
            await repository.ensureInitialized([])
            expect(await repository.findAll()).toEqual([])
        })
    })
})
