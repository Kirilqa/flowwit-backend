import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const updateMemoryToolSchema = z.object({
    scope: z
        .enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
        .describe('Scope the entry belongs to'),
    id: z.string().min(1).describe('Id of the memory entry to update, as returned by memory_write or memory_list'),
    content: z.string().min(1).optional().describe('New content, replaces the existing fact'),
    pinned: z.boolean().optional().describe('New pinned state')
})
