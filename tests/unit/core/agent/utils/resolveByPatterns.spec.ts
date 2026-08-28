import { resolveByPatterns } from '@agent/utils/resolveByPatterns'

type Entity = { id: string }

const entities: Array<Entity> = [{ id: 'search' }, { id: 'calculator' }, { id: 'weather' }]

const getId = (e: Entity) => e.id

describe('resolveByPatterns', () => {
    let onUnmatchedPattern: jest.Mock

    beforeEach(() => {
        onUnmatchedPattern = jest.fn()
    })

    it('returns entity matching an exact id', () => {
        const result = resolveByPatterns(['search'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('search')
    })

    it('returns all entities matching a wildcard', () => {
        const result = resolveByPatterns(['*'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(3)
    })

    it('matches prefix glob pattern', () => {
        const result = resolveByPatterns(['calc*'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('calculator')
    })

    it('deduplicates entities matched by multiple patterns', () => {
        const result = resolveByPatterns(['search', '*'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(3)
    })

    it('invokes onUnmatchedPattern and skips patterns that match nothing', () => {
        const result = resolveByPatterns(['nonexistent'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(0)
        expect(onUnmatchedPattern).toHaveBeenCalledWith('Tool', 'nonexistent', 'agent')
    })

    it('includes entity type and agent name in the callback arguments', () => {
        resolveByPatterns(['no-match'], entities, getId, 'Skill', 'my-agent', onUnmatchedPattern)
        expect(onUnmatchedPattern).toHaveBeenCalledWith('Skill', 'no-match', 'my-agent')
    })

    it('returns empty array when patterns list is empty', () => {
        const result = resolveByPatterns([], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(0)
        expect(onUnmatchedPattern).not.toHaveBeenCalled()
    })

    it('returns empty array when entity list is empty', () => {
        const result = resolveByPatterns(['*'], [], getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(0)
        expect(onUnmatchedPattern).toHaveBeenCalled()
    })

    it('preserves original entity order', () => {
        const result = resolveByPatterns(['*'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result.map(e => e.id)).toEqual(['search', 'calculator', 'weather'])
    })

    it('handles multiple non-overlapping patterns', () => {
        const result = resolveByPatterns(['search', 'weather'], entities, getId, 'Tool', 'agent', onUnmatchedPattern)
        expect(result).toHaveLength(2)
        expect(result.map(e => e.id)).toContain('search')
        expect(result.map(e => e.id)).toContain('weather')
    })

    it('propagates an error thrown by the onUnmatchedPattern callback', () => {
        const throwingCallback = (): never => {
            throw new Error('boom')
        }
        expect(() => resolveByPatterns(['nonexistent'], entities, getId, 'Tool', 'agent', throwingCallback)).toThrow(
            'boom'
        )
    })
})
