import { buildMemoryPartition, MemoryPartition, MemoryScope } from '@memory'
import { AgentToolError } from '../../../errors'

export function resolveRequiredPartition(
    scope: MemoryScope,
    agentId: string,
    workingDirectory: string | undefined
): MemoryPartition {
    const partition = buildMemoryPartition(scope, agentId, workingDirectory)

    if (partition === null) {
        throw new AgentToolError('Project scope requires a working directory, but this session does not have one set.')
    }

    return partition
}
