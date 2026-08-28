import { MEMORY_SCOPE, MemoryPartition } from '../types'

export function resolveAllMemoryPartitions(
    agentId: string,
    workingDirectory: string | undefined
): Array<MemoryPartition> {
    const partitions: Array<MemoryPartition> = [
        { scope: MEMORY_SCOPE.GLOBAL },
        { scope: MEMORY_SCOPE.AGENT, owner: agentId }
    ]

    if (workingDirectory !== undefined) {
        partitions.push({ scope: MEMORY_SCOPE.PROJECT, owner: workingDirectory })
    }

    return partitions
}
