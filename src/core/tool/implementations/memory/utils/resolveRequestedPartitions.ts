import { buildMemoryPartition, MemoryPartition, MemoryScope, resolveAllMemoryPartitions } from '@memory'
import { AgentToolError } from '../../../errors'

export function resolveRequestedPartitions(
    scope: MemoryScope | undefined,
    agentId: string,
    workingDirectory: string | undefined
): Array<MemoryPartition> {
    if (scope === undefined) {
        return resolveAllMemoryPartitions(agentId, workingDirectory)
    }

    const partition = buildMemoryPartition(scope, agentId, workingDirectory)

    if (partition === null) {
        throw new AgentToolError('Project scope requires a working directory, but this session does not have one set.')
    }

    return [partition]
}
