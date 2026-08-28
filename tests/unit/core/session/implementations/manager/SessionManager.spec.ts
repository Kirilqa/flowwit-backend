import { SessionManager } from '@session/implementations/manager/SessionManager'
import { Session } from '@session/implementations/session/Session'
import { SESSION_STATUS, SessionCreateOptions, SessionInterface, SessionRepositoryInterface } from '@session'

function makeRepository(): jest.Mocked<SessionRepositoryInterface> {
    return {
        findAll: jest.fn<Promise<Array<SessionInterface>>, []>().mockResolvedValue([]),
        findById: jest.fn<Promise<SessionInterface | null>, [string]>().mockResolvedValue(null),
        create: jest.fn<Promise<SessionInterface>, [SessionInterface]>().mockImplementation(s => Promise.resolve(s)),
        update: jest
            .fn<Promise<SessionInterface>, [string, SessionInterface]>()
            .mockImplementation((_, s) => Promise.resolve(s)),
        delete: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
        ensureInitialized: jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
    }
}

function makeFactory(): jest.Mock {
    return jest.fn().mockImplementation((id: string, options?: SessionCreateOptions) => new Session(id, [], options))
}

describe('SessionManager', () => {
    let repository: jest.Mocked<SessionRepositoryInterface>
    let factory: jest.Mock
    let manager: SessionManager

    beforeEach(() => {
        repository = makeRepository()
        factory = makeFactory()
        manager = new SessionManager(repository, factory)
    })

    describe('initialize()', () => {
        it('loads all sessions from repository into cache', async () => {
            const session = new Session('s1')
            repository.findAll.mockResolvedValue([session])
            await manager.initialize()
            const loaded = await manager.get('s1')
            expect(loaded).toBe(session)
        })

        it('calls commitSession on each loaded session', async () => {
            const session = new Session('s1')
            session.addMessage({ id: 'msg-1', role: 'user', content: 'hello', createdAt: 0 })
            repository.findAll.mockResolvedValue([session])
            await manager.initialize()
            const loaded = await manager.get('s1')
            const messages = loaded?.getMessages() ?? []
            expect(messages.every(m => m.metadata?.['currentSession'] !== true)).toBe(true)
        })

        it('sets status to IDLE for each loaded session', async () => {
            const session = new Session('s1')
            repository.findAll.mockResolvedValue([session])
            await manager.initialize()
            const loaded = await manager.get('s1')
            expect(loaded?.status).toBe(SESSION_STATUS.IDLE)
        })
    })

    describe('create()', () => {
        it('returns a new session with the given id', async () => {
            const session = await manager.create('s1')
            expect(session.id).toBe('s1')
        })

        it('stores the session in the cache', async () => {
            await manager.create('s1')
            const found = await manager.get('s1')
            expect(found?.id).toBe('s1')
        })

        it('calls repository.create with the new session', async () => {
            await manager.create('s1')
            expect(repository.create).toHaveBeenCalledTimes(1)
        })

        it('passes optional parameters to factory', async () => {
            const options: SessionCreateOptions = {
                title: 'My Title',
                contextWindow: 8192,
                workingDirectory: '/workspace',
                createdAt: 1000
            }
            await manager.create('s1', options)
            expect(factory).toHaveBeenCalledWith('s1', options)
        })

        it('calls repository.create for a non-temporary session', async () => {
            await manager.create('s1', { temporary: false })
            expect(repository.create).toHaveBeenCalledTimes(1)
        })

        it('does not call repository.create for a temporary session', async () => {
            await manager.create('s1', { temporary: true })
            expect(repository.create).not.toHaveBeenCalled()
        })

        it('still stores a temporary session in the cache', async () => {
            await manager.create('s1', { temporary: true })
            const found = await manager.get('s1')
            expect(found?.temporary).toBe(true)
        })
    })

    describe('get()', () => {
        it('returns the session from cache by id', async () => {
            await manager.create('s1')
            const found = await manager.get('s1')
            expect(found?.id).toBe('s1')
        })

        it('returns null for unknown session id', async () => {
            const found = await manager.get('missing')
            expect(found).toBeNull()
        })

        it('does not call repository.findById', async () => {
            await manager.get('any')
            expect(repository.findById).not.toHaveBeenCalled()
        })
    })

    describe('save()', () => {
        it('updates the session in cache', async () => {
            const session = await manager.create('s1')
            session.setTitle('Updated')
            await manager.save(session)
            const found = await manager.get('s1')
            expect(found?.title).toBe('Updated')
        })

        it('calls repository.update', async () => {
            const session = await manager.create('s1')
            await manager.save(session)
            expect(repository.update).toHaveBeenCalledWith('s1', session)
        })

        it('does not call repository.update for a temporary session', async () => {
            const session = await manager.create('s1', { temporary: true })
            await manager.save(session)
            expect(repository.update).not.toHaveBeenCalled()
        })

        it('still updates a temporary session in cache', async () => {
            const session = await manager.create('s1', { temporary: true })
            session.setTitle('Updated')
            await manager.save(session)
            const found = await manager.get('s1')
            expect(found?.title).toBe('Updated')
        })
    })

    describe('list()', () => {
        it('returns empty array when no sessions exist', async () => {
            const sessions = await manager.list()
            expect(sessions).toHaveLength(0)
        })

        it('returns all sessions in cache', async () => {
            await manager.create('s1')
            await manager.create('s2')
            const sessions = await manager.list()
            expect(sessions).toHaveLength(2)
        })
    })

    describe('delete()', () => {
        it('removes the session from cache', async () => {
            await manager.create('s1')
            await manager.delete('s1')
            const found = await manager.get('s1')
            expect(found).toBeNull()
        })

        it('calls repository.delete with the session id', async () => {
            await manager.create('s1')
            await manager.delete('s1')
            expect(repository.delete).toHaveBeenCalledWith('s1')
        })
    })
})
