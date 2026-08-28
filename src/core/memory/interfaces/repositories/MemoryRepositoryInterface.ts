import { InitializableInterface } from '@core/interfaces'
import { MemoryEntry, MemoryEntryPatch, MemoryPartition } from '../../types'

export interface MemoryRepositoryInterface extends InitializableInterface {
    create(partition: MemoryPartition, content: string, pinned: boolean): Promise<MemoryEntry>
    findById(partition: MemoryPartition, id: string): Promise<MemoryEntry | null>
    findAll(partition: MemoryPartition): Promise<Array<MemoryEntry>>
    update(partition: MemoryPartition, id: string, patch: MemoryEntryPatch): Promise<MemoryEntry>
    delete(partition: MemoryPartition, id: string): Promise<void>
    search(partition: MemoryPartition, query: string): Promise<Array<MemoryEntry>>
}
