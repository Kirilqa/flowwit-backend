import { MemoryScope } from './MemoryScope'

export type MemoryEntry = {
    id: string
    scope: MemoryScope
    content: string
    pinned: boolean
    createdAt: number
    updatedAt: number
}
