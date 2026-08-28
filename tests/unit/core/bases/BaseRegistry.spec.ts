import { BaseRegistry } from '@core/bases/BaseRegistry'

class TestRegistry extends BaseRegistry<string> {}

describe('BaseRegistry', () => {
    let registry: TestRegistry

    beforeEach(() => {
        registry = new TestRegistry()
    })

    describe('register()', () => {
        it('stores an entity under the given name', () => {
            registry.register('a', 'value-a')
            expect(registry.get('a')).toBe('value-a')
        })

        it('overwrites an existing entity with the same name', () => {
            registry.register('a', 'first')
            registry.register('a', 'second')
            expect(registry.get('a')).toBe('second')
        })
    })

    describe('get()', () => {
        it('returns the entity for a registered name', () => {
            registry.register('x', 'x-value')
            expect(registry.get('x')).toBe('x-value')
        })

        it('returns null for an unknown name', () => {
            expect(registry.get('missing')).toBeNull()
        })
    })

    describe('has()', () => {
        it('returns true for a registered name', () => {
            registry.register('y', 'y-value')
            expect(registry.has('y')).toBe(true)
        })

        it('returns false for an unknown name', () => {
            expect(registry.has('missing')).toBe(false)
        })
    })

    describe('unregister()', () => {
        it('removes the entity from the registry', () => {
            registry.register('z', 'z-value')
            registry.unregister('z')
            expect(registry.get('z')).toBeNull()
        })

        it('is a no-op when name does not exist', () => {
            expect(() => {
                registry.unregister('missing')
            }).not.toThrow()
        })
    })

    describe('list()', () => {
        it('returns empty array when registry is empty', () => {
            expect(registry.list()).toEqual([])
        })

        it('returns all registered entities', () => {
            registry.register('a', 'a-value')
            registry.register('b', 'b-value')
            const items = registry.list()
            expect(items).toHaveLength(2)
            expect(items).toContain('a-value')
            expect(items).toContain('b-value')
        })

        it('does not include unregistered entities', () => {
            registry.register('a', 'a-value')
            registry.register('b', 'b-value')
            registry.unregister('a')
            expect(registry.list()).toEqual(['b-value'])
        })
    })
})
