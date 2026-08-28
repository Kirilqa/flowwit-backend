import { z } from 'zod'
import { MemoryRepositoryInterface } from '@memory'
import { AgentToolError } from '../../errors'
import { BaseMemoryTool } from './bases/BaseMemoryTool'
import { resolveRequiredPartition } from './utils/resolveRequiredPartition'
import { deleteMemoryToolSchema } from './validators'

export class DeleteMemoryTool extends BaseMemoryTool<typeof deleteMemoryToolSchema> {
    readonly name = 'memory_delete'
    readonly description = 'Deletes a memory entry permanently.'
    readonly schema = deleteMemoryToolSchema

    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {
        super()
    }

    protected async run(
        args: z.infer<typeof deleteMemoryToolSchema>,
        agentId: string,
        _sessionId: string,
        workingDirectory?: string
    ): Promise<string> {
        const partition = resolveRequiredPartition(args.scope, agentId, workingDirectory)

        const existing = await this.memoryRepository.findById(partition, args.id)

        if (existing === null) {
            throw new AgentToolError(`Memory entry "${args.id}" not found in scope "${args.scope}".`)
        }

        await this.memoryRepository.delete(partition, args.id)

        return `Memory entry "${args.id}" deleted successfully.`
    }
}
