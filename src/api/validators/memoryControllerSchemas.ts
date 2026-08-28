import { z } from 'zod'
import { MEMORY_SCOPE } from '@memory'

export const memoryScopeParamsSchema = z.object({
    scope: z.enum([MEMORY_SCOPE.GLOBAL, MEMORY_SCOPE.AGENT, MEMORY_SCOPE.PROJECT])
})

export const memoryEntryParamsSchema = memoryScopeParamsSchema.extend({
    id: z.string().min(1)
})

export const memoryOwnerQuerySchema = z.object({
    owner: z.string().min(1).optional()
})

export const memoryCreateBodySchema = z.object({
    content: z.string().min(1),
    pinned: z.boolean().optional()
})

export const memoryUpdateBodySchema = z.object({
    content: z.string().min(1).optional(),
    pinned: z.boolean().optional()
})
