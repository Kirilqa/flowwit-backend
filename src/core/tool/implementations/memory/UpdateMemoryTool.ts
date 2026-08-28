import { z } from 'zod'
import { MemoryEntryPatch, MemoryRepositoryInterface } from '@memory'
import { AgentToolError } from '../../errors'
import { BaseMemoryTool } from './bases/BaseMemoryTool'
import { MemorySummary } from './types'
import { buildMemorySummary } from './utils/buildMemorySummary'
import { resolveRequiredPartition } from './utils/resolveRequiredPartition'
import { updateMemoryToolSchema } from './validators'

export class UpdateMemoryTool extends BaseMemoryTool<typeof updateMemoryToolSchema> {
    readonly name = 'memory_update'
    readonly description =
        'Updates an existing memory entry. Only the provided fields are changed, the rest remain as is.'
    readonly schema = updateMemoryToolSchema

    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {
        super()
    }

    protected async run(
        args: z.infer<typeof updateMemoryToolSchema>,
        agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<MemorySummary> {
        const partition = resolveRequiredPartition(args.scope, agentId, workingDirectory)

        const existing = await this.memoryRepository.findById(partition, args.id)

        if (existing === null) {
            throw new AgentToolError(`Memory entry "${args.id}" not found in scope "${args.scope}".`)
        }

        const patch: MemoryEntryPatch = {
            ...(args.content !== undefined && { content: args.content }),
            ...(args.pinned !== undefined && { pinned: args.pinned })
        }

        const entry = await this.memoryRepository.update(partition, args.id, patch)

        return buildMemorySummary(entry)
    }
}
