import { resolveAllMemoryPartitions } from '@memory/utils/resolveAllMemoryPartitions'
import { MEMORY_SCOPE } from '@memory'

describe('resolveAllMemoryPartitions', () => {
    it('returns global and agent partitions when there is no working directory', () => {
        expect(resolveAllMemoryPartitions('agent-1', undefined)).toEqual([
            { scope: MEMORY_SCOPE.GLOBAL },
            { scope: MEMORY_SCOPE.AGENT, owner: 'agent-1' }
        ])
    })

    it('also includes a project partition when a working directory is set', () => {
        expect(resolveAllMemoryPartitions('agent-1', 'C:\\project')).toEqual([
            { scope: MEMORY_SCOPE.GLOBAL },
            { scope: MEMORY_SCOPE.AGENT, owner: 'agent-1' },
            { scope: MEMORY_SCOPE.PROJECT, owner: 'C:\\project' }
        ])
    })
})
