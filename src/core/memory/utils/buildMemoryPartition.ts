import { MEMORY_SCOPE, MemoryPartition, MemoryScope } from '../types'

export function buildMemoryPartition(
    scope: MemoryScope,
    agentId: string,
    workingDirectory: string | undefined
): MemoryPartition | null {
    if (scope === MEMORY_SCOPE.GLOBAL) {
        return { scope }
    }

    if (scope === MEMORY_SCOPE.AGENT) {
        return { scope, owner: agentId }
    }

    if (workingDirectory === undefined) {
        return null
    }

    return { scope, owner: workingDirectory }
}
