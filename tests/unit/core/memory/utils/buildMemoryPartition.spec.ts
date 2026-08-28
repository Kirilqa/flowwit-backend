import { buildMemoryPartition } from '@memory/utils/buildMemoryPartition'
import { MEMORY_SCOPE } from '@memory'

describe('buildMemoryPartition', () => {
    it('builds a global partition with no owner', () => {
        expect(buildMemoryPartition(MEMORY_SCOPE.GLOBAL, 'agent-1', undefined)).toEqual({ scope: MEMORY_SCOPE.GLOBAL })
    })

    it('builds an agent partition owned by the agent id', () => {
        expect(buildMemoryPartition(MEMORY_SCOPE.AGENT, 'agent-1', undefined)).toEqual({
            scope: MEMORY_SCOPE.AGENT,
            owner: 'agent-1'
        })
    })

    it('builds a project partition owned by the working directory', () => {
        expect(buildMemoryPartition(MEMORY_SCOPE.PROJECT, 'agent-1', 'C:\\project')).toEqual({
            scope: MEMORY_SCOPE.PROJECT,
            owner: 'C:\\project'
        })
    })

    it('returns null for project scope when there is no working directory', () => {
        expect(buildMemoryPartition(MEMORY_SCOPE.PROJECT, 'agent-1', undefined)).toBeNull()
    })
})
