import { z } from 'zod'
import { MemoryRepositoryInterface } from '@memory'
import { BaseMemoryTool } from './bases/BaseMemoryTool'
import { MemorySummary } from './types'
import { buildMemorySummary } from './utils/buildMemorySummary'
import { resolveRequestedPartitions } from './utils/resolveRequestedPartitions'
import { searchMemoryToolSchema } from './validators'

export class SearchMemoryTool extends BaseMemoryTool<typeof searchMemoryToolSchema> {
    readonly name = 'memory_search'
    readonly description =
        'Searches previously saved memory for facts relevant to a query. Only searches memory that was not pinned — pinned memory is already visible in your context.'
    readonly schema = searchMemoryToolSchema

    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {
        super()
    }

    protected async run(
        args: z.infer<typeof searchMemoryToolSchema>,
        agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<Array<MemorySummary>> {
        const partitions = resolveRequestedPartitions(args.scope, agentId, workingDirectory)

        const results = await Promise.all(
            partitions.map(partition => this.memoryRepository.search(partition, args.query))
        )

        return results.flat().map(buildMemorySummary)
    }
}
