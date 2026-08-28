import { MemoryEntry } from '@memory'
import { MemorySummary } from '../types'

export function buildMemorySummary(entry: MemoryEntry): MemorySummary {
    return {
        id: entry.id,
        scope: entry.scope,
        content: entry.content,
        pinned: entry.pinned,
        createdAt: entry.createdAt
    }
}
