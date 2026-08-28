import { FileMemoryRepository } from '@memory/repositories/FileMemoryRepository'
import { MEMORY_SCOPE, MemoryPartition } from '@memory'
import { makeTempDir, removeTempDir } from '../../../../helpers/tempDir'

const GLOBAL_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.GLOBAL }
const AGENT_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.AGENT, owner: 'agent-1' }
const PROJECT_PARTITION: MemoryPartition = { scope: MEMORY_SCOPE.PROJECT, owner: 'C:\\some\\project' }

describe('FileMemoryRepository (integration)', () => {
    let testDir: string
    let repository: FileMemoryRepository

    beforeEach(async () => {
        testDir = await makeTempDir('memory-repo-test')
        repository = new FileMemoryRepository(testDir)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('create()', () => {
        it('creates an entry with a generated id and correct fields', async () => {
            const entry = await repository.create(GLOBAL_PARTITION, 'a fact', false)
            expect(entry.id).toBeTruthy()
            expect(entry.content).toBe('a fact')
            expect(entry.pinned).toBe(false)
            expect(entry.scope).toBe(MEMORY_SCOPE.GLOBAL)
        })

        it('sets createdAt and updatedAt to the same value on create', async () => {
            const entry = await repository.create(GLOBAL_PARTITION, 'a fact', true)
            expect(entry.createdAt).toBe(entry.updatedAt)
        })
    })

    describe('findById()', () => {
        it('returns null for a non-existent id', async () => {
            expect(await repository.findById(GLOBAL_PARTITION, 'missing')).toBeNull()
        })

        it('returns the entry that was created', async () => {
            const created = await repository.create(GLOBAL_PARTITION, 'find me', true)
            const found = await repository.findById(GLOBAL_PARTITION, created.id)
            expect(found?.content).toBe('find me')
            expect(found?.pinned).toBe(true)
        })
    })

    describe('findAll()', () => {
        it('returns empty array when partition has no entries', async () => {
            expect(await repository.findAll(GLOBAL_PARTITION)).toEqual([])
        })

        it('returns all entries created in a partition', async () => {
            await repository.create(GLOBAL_PARTITION, 'one', false)
            await repository.create(GLOBAL_PARTITION, 'two', false)
            expect(await repository.findAll(GLOBAL_PARTITION)).toHaveLength(2)
        })

        it('keeps different scopes isolated', async () => {
            await repository.create(GLOBAL_PARTITION, 'global fact', false)
            await repository.create(AGENT_PARTITION, 'agent fact', false)
            expect(await repository.findAll(GLOBAL_PARTITION)).toHaveLength(1)
            expect(await repository.findAll(AGENT_PARTITION)).toHaveLength(1)
        })

        it('keeps different agent owners isolated', async () => {
            await repository.create(AGENT_PARTITION, 'agent-1 fact', false)
            await repository.create({ scope: MEMORY_SCOPE.AGENT, owner: 'agent-2' }, 'agent-2 fact', false)
            expect(await repository.findAll(AGENT_PARTITION)).toHaveLength(1)
        })

        it('keeps different project working directories isolated', async () => {
            await repository.create(PROJECT_PARTITION, 'project fact', false)
            await repository.create({ scope: MEMORY_SCOPE.PROJECT, owner: 'C:\\other\\project' }, 'other fact', false)
            const found = await repository.findAll(PROJECT_PARTITION)
            expect(found).toHaveLength(1)
            expect(found[0]?.content).toBe('project fact')
        })
    })

    describe('update()', () => {
        it('updates content and bumps updatedAt', async () => {
            const created = await repository.create(GLOBAL_PARTITION, 'old', false)
            const updated = await repository.update(GLOBAL_PARTITION, created.id, { content: 'new' })
            expect(updated.content).toBe('new')
            expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
        })

        it('preserves createdAt and id across an update', async () => {
            const created = await repository.create(GLOBAL_PARTITION, 'old', false)
            const updated = await repository.update(GLOBAL_PARTITION, created.id, { pinned: true })
            expect(updated.createdAt).toBe(created.createdAt)
            expect(updated.id).toBe(created.id)
        })

        it('only changes fields present in the patch', async () => {
            const created = await repository.create(GLOBAL_PARTITION, 'content', false)
            const updated = await repository.update(GLOBAL_PARTITION, created.id, { pinned: true })
            expect(updated.content).toBe('content')
            expect(updated.pinned).toBe(true)
        })

        it('throws when the entry does not exist', async () => {
            await expect(repository.update(GLOBAL_PARTITION, 'missing', { content: 'x' })).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the entry so findById returns null', async () => {
            const created = await repository.create(GLOBAL_PARTITION, 'to delete', false)
            await repository.delete(GLOBAL_PARTITION, created.id)
            expect(await repository.findById(GLOBAL_PARTITION, created.id)).toBeNull()
        })

        it('excludes the deleted entry from findAll results', async () => {
            const keep = await repository.create(GLOBAL_PARTITION, 'keep', false)
            const remove = await repository.create(GLOBAL_PARTITION, 'remove', false)
            await repository.delete(GLOBAL_PARTITION, remove.id)
            const all = await repository.findAll(GLOBAL_PARTITION)
            expect(all).toHaveLength(1)
            expect(all[0]?.id).toBe(keep.id)
        })

        it('throws when the entry does not exist', async () => {
            await expect(repository.delete(GLOBAL_PARTITION, 'missing')).rejects.toThrow()
        })
    })

    describe('search()', () => {
        it('returns entries whose content matches all query terms', async () => {
            await repository.create(GLOBAL_PARTITION, 'the sky is blue', false)
            await repository.create(GLOBAL_PARTITION, 'the grass is green', false)
            const results = await repository.search(GLOBAL_PARTITION, 'sky blue')
            expect(results).toHaveLength(1)
            expect(results[0]?.content).toBe('the sky is blue')
        })

        it('returns empty array when nothing matches', async () => {
            await repository.create(GLOBAL_PARTITION, 'the sky is blue', false)
            expect(await repository.search(GLOBAL_PARTITION, 'nonexistent term')).toEqual([])
        })

        it('is case-insensitive', async () => {
            await repository.create(GLOBAL_PARTITION, 'The Sky Is Blue', false)
            expect(await repository.search(GLOBAL_PARTITION, 'sky')).toHaveLength(1)
        })

        it('ranks entries matching more query terms first', async () => {
            await repository.create(GLOBAL_PARTITION, 'apple banana', false)
            await repository.create(GLOBAL_PARTITION, 'apple banana cherry', false)
            const results = await repository.search(GLOBAL_PARTITION, 'apple banana cherry')
            expect(results[0]?.content).toBe('apple banana cherry')
        })
    })
})
