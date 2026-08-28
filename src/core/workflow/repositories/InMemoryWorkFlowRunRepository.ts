import { WorkFlowRunRepositoryInterface } from '../interfaces/repositories/WorkFlowRunRepositoryInterface'
import { WorkFlowRunInterface } from '../interfaces/WorkFlowRunInterface'
import { WorkFlowRunError } from '../errors/WorkFlowRunError'

export class InMemoryWorkFlowRunRepository implements WorkFlowRunRepositoryInterface {
    private readonly store = new Map<string, WorkFlowRunInterface>()

    async findAll(): Promise<Array<WorkFlowRunInterface>> {
        return [...this.store.values()]
    }

    async findById(id: string): Promise<WorkFlowRunInterface | null> {
        return this.store.get(id) ?? null
    }

    async create(entity: WorkFlowRunInterface): Promise<WorkFlowRunInterface> {
        this.store.set(entity.id, entity)
        return entity
    }

    async update(id: string, patch: WorkFlowRunInterface): Promise<WorkFlowRunInterface> {
        const existing = this.store.get(id)

        if (existing === undefined) {
            throw new WorkFlowRunError(`WorkFlow run "${id}" not found`)
        }

        const updated = { ...existing, ...patch }
        this.store.set(id, updated)
        return updated
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async ensureInitialized(): Promise<void> {}
}
