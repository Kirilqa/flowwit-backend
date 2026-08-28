import { InMemorySessionRepository } from '@session/repositories/InMemorySessionRepository'
import { makeSession } from '../../../../helpers/makeAgent'

describe('InMemorySessionRepository', () => {
    let repository: InMemorySessionRepository

    beforeEach(() => {
        repository = new InMemorySessionRepository()
    })

    describe('findAll()', () => {
        it('returns empty array when store is empty', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns all created sessions', async () => {
            const s1 = makeSession('s1')
            const s2 = makeSession('s2')
            await repository.create(s1)
            await repository.create(s2)
            const all = await repository.findAll()
            expect(all).toHaveLength(2)
        })
    })

    describe('findById()', () => {
        it('returns the session with the matching id', async () => {
            const session = makeSession('s1')
            await repository.create(session)
            const found = await repository.findById('s1')
            expect(found?.id).toBe('s1')
        })

        it('returns null for unknown id', async () => {
            const found = await repository.findById('missing')
            expect(found).toBeNull()
        })
    })

    describe('create()', () => {
        it('stores the session and returns it', async () => {
            const session = makeSession('s1')
            const result = await repository.create(session)
            expect(result).toBe(session)
        })

        it('makes the session findable afterwards', async () => {
            const session = makeSession('s1')
            await repository.create(session)
            expect(await repository.findById('s1')).toBe(session)
        })
    })

    describe('update()', () => {
        it('replaces the stored session and returns the new one', async () => {
            const original = makeSession('s1')
            await repository.create(original)
            const updated = makeSession('s1')
            const result = await repository.update('s1', updated)
            expect(result).toBe(updated)
        })

        it('makes the updated session findable', async () => {
            const original = makeSession('s1')
            await repository.create(original)
            const updated = makeSession('s1')
            await repository.update('s1', updated)
            expect(await repository.findById('s1')).toBe(updated)
        })

        it('throws when session id is not found', async () => {
            const session = makeSession('missing')
            await expect(repository.update('missing', session)).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the session from the store', async () => {
            const session = makeSession('s1')
            await repository.create(session)
            await repository.delete('s1')
            expect(await repository.findById('s1')).toBeNull()
        })

        it('is a no-op when id does not exist', async () => {
            await expect(repository.delete('missing')).resolves.toBeUndefined()
        })

        it('does not remove other sessions', async () => {
            await repository.create(makeSession('s1'))
            await repository.create(makeSession('s2'))
            await repository.delete('s1')
            expect(await repository.findById('s2')).not.toBeNull()
        })
    })
})
