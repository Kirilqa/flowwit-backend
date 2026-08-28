import { resolveDefaultMemoryScope } from '@memory/utils/resolveDefaultMemoryScope'
import { MEMORY_SCOPE } from '@memory'

describe('resolveDefaultMemoryScope', () => {
    it('returns project when a working directory is set', () => {
        expect(resolveDefaultMemoryScope('C:\\project')).toBe(MEMORY_SCOPE.PROJECT)
    })

    it('returns agent when no working directory is set', () => {
        expect(resolveDefaultMemoryScope(undefined)).toBe(MEMORY_SCOPE.AGENT)
    })
})
