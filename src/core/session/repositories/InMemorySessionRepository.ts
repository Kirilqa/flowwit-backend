import { SessionInterface, SessionRepositoryInterface } from '../interfaces'

export class InMemorySessionRepository implements SessionRepositoryInterface {
    private readonly store = new Map<string, SessionInterface>()

    async findAll(): Promise<Array<SessionInterface>> {
        return Array.from(this.store.values())
    }

    async findById(id: string): Promise<SessionInterface | null> {
        return this.store.get(id) ?? null
    }

    async create(session: SessionInterface): Promise<SessionInterface> {
        this.store.set(session.id, session)
        return session
    }

    async update(id: string, session: SessionInterface): Promise<SessionInterface> {
        if (!this.store.has(id)) {
            throw new Error(`Session "${id}" not found`)
        }

        this.store.set(id, session)
        return session
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async ensureInitialized(): Promise<void> {}
}
