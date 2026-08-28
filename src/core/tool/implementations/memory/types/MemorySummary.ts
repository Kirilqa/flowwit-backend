import { MemoryScope } from '@memory'

export type MemorySummary = {
    id: string
    scope: MemoryScope
    content: string
    pinned: boolean
    createdAt: number
}
