import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const deleteMemoryToolSchema = z.object({
    scope: z
        .enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
        .describe('Scope the entry belongs to'),
    id: z.string().min(1).describe('Id of the memory entry to delete, as returned by memory_write or memory_list')
})
