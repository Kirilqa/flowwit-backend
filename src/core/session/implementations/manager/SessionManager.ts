import { SessionManagerInterface, SessionRepositoryInterface, SessionInterface } from '../../interfaces'
import { SESSION_STATUS } from '../../types'
import { SessionFactory } from '../../types/SessionFactory'
import { SessionCreateOptions } from '../../types/SessionCreateOptions'

export class SessionManager implements SessionManagerInterface {
    private readonly cache = new Map<string, SessionInterface>()

    constructor(
        private readonly repository: SessionRepositoryInterface,
        private readonly factory: SessionFactory
    ) {}

    async initialize(): Promise<void> {
        const sessions = await this.repository.findAll()
        for (const session of sessions) {
            session.commitSession()
            session.setStatus(SESSION_STATUS.IDLE)
            this.cache.set(session.id, session)
        }
    }

    async create(sessionId: string, options: SessionCreateOptions = {}): Promise<SessionInterface> {
        const session = this.factory(sessionId, options)
        this.cache.set(session.id, session)

        if (!session.temporary) {
            await this.repository.create(session)
        }

        return session
    }

    async get(sessionId: string): Promise<SessionInterface | null> {
        return this.cache.get(sessionId) ?? null
    }

    async save(session: SessionInterface): Promise<void> {
        this.cache.set(session.id, session)

        if (!session.temporary) {
            await this.repository.update(session.id, session)
        }
    }

    async list(): Promise<Array<SessionInterface>> {
        return Array.from(this.cache.values())
    }

    async delete(sessionId: string): Promise<void> {
        this.cache.delete(sessionId)
        await this.repository.delete(sessionId)
    }
}
