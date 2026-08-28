import { z } from 'zod'
import { MemoryRepositoryInterface } from '@memory'
import { BaseMemoryTool } from './bases/BaseMemoryTool'
import { MemorySummary } from './types'
import { buildMemorySummary } from './utils/buildMemorySummary'
import { resolveRequestedPartitions } from './utils/resolveRequestedPartitions'
import { listMemoriesToolSchema } from './validators'

export class ListMemoriesTool extends BaseMemoryTool<typeof listMemoriesToolSchema> {
    readonly name = 'memory_list'
    readonly description =
        'Lists everything saved in memory, including entries not currently pinned. Use this to audit what you know, check what is pinned, or find the id of an entry to update or delete.'
    readonly schema = listMemoriesToolSchema

    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {
        super()
    }

    protected async run(
        args: z.infer<typeof listMemoriesToolSchema>,
        agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<Array<MemorySummary>> {
        const partitions = resolveRequestedPartitions(args.scope, agentId, workingDirectory)

        const results = await Promise.all(partitions.map(partition => this.memoryRepository.findAll(partition)))

        return results.flat().map(buildMemorySummary)
    }
}
