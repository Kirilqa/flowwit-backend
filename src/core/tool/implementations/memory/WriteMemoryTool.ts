import { z } from 'zod'
import { MemoryRepositoryInterface, resolveDefaultMemoryScope } from '@memory'
import { BaseMemoryTool } from './bases/BaseMemoryTool'
import { MemorySummary } from './types'
import { buildMemorySummary } from './utils/buildMemorySummary'
import { resolveRequiredPartition } from './utils/resolveRequiredPartition'
import { writeMemoryToolSchema } from './validators'

export class WriteMemoryTool extends BaseMemoryTool<typeof writeMemoryToolSchema> {
    readonly name = 'memory_write'
    readonly description =
        'Saves a fact to persistent memory that survives across sessions and conversations. By default the fact is only retrievable via memory_search; set pinned to true to make it always visible in your context instead.'
    readonly schema = writeMemoryToolSchema

    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {
        super()
    }

    protected async run(
        args: z.infer<typeof writeMemoryToolSchema>,
        agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<MemorySummary> {
        const scope = args.scope ?? resolveDefaultMemoryScope(workingDirectory)
        const partition = resolveRequiredPartition(scope, agentId, workingDirectory)

        const entry = await this.memoryRepository.create(partition, args.content, args.pinned ?? false)

        return buildMemorySummary(entry)
    }
}
