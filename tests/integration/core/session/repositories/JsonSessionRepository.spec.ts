import { JsonSessionRepository } from '@session/repositories/JsonSessionRepository'
import { SESSION_STATUS, SessionFactory, SessionInterface } from '@session'
import { Session } from '@session/implementations/session/Session'
import { AgentMessage } from '@agent/types/AgentMessage'
import { MESSAGE_ROLE } from '@provider'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { makeTempDir, makeTempDirPath, removeTempDir } from '../../../../helpers/tempDir'

const factory: SessionFactory = (id, options) => new Session(id, [], options)

function makeSession(id: string, title?: string): SessionInterface {
    return new Session(id, [], title !== undefined ? { title } : {})
}

function userMsg(id: string, content: string): AgentMessage {
    return { id, role: MESSAGE_ROLE.USER, content, createdAt: 0 }
}

function assistantMsg(id: string, content: string): AgentMessage {
    return { id, role: MESSAGE_ROLE.ASSISTANT, content, createdAt: 0 }
}

function systemMsg(id: string, content: string): AgentMessage {
    return { id, role: MESSAGE_ROLE.SYSTEM, content, createdAt: 0 }
}

describe('JsonSessionRepository (integration)', () => {
    let testDir: string
    let repository: JsonSessionRepository

    beforeEach(async () => {
        testDir = await makeTempDir('session-repo-test')
        repository = new JsonSessionRepository(testDir, factory)
    })

    afterEach(async () => {
        await removeTempDir(testDir)
    })

    describe('findAll()', () => {
        it('returns empty array when directory has no JSON files', async () => {
            expect(await repository.findAll()).toEqual([])
        })

        it('returns empty array when the directory does not exist', async () => {
            const missingDir = makeTempDirPath('session-repo-missing')
            const missingRepo = new JsonSessionRepository(missingDir, factory)
            expect(await missingRepo.findAll()).toEqual([])
        })

        it('returns all persisted sessions', async () => {
            await repository.create(makeSession('s1'))
            await repository.create(makeSession('s2'))
            await repository.create(makeSession('s3'))

            expect(await repository.findAll()).toHaveLength(3)
        })
    })

    describe('create() + findById()', () => {
        it('returns null for a non-existent session', async () => {
            expect(await repository.findById('missing')).toBeNull()
        })

        it('persists a session and retrieves it by id', async () => {
            const session = makeSession('s1')
            await repository.create(session)

            const found = await repository.findById('s1')
            expect(found?.id).toBe('s1')
        })

        it('returns the created session from create()', async () => {
            const session = makeSession('s2')
            const result = await repository.create(session)

            expect(result).toBe(session)
        })

        it('restores title', async () => {
            const session = makeSession('s3', 'My Title')
            await repository.create(session)

            const found = await repository.findById('s3')
            expect(found?.title).toBe('My Title')
        })

        it('restores status', async () => {
            const session = makeSession('s4')
            session.setStatus(SESSION_STATUS.DONE)
            await repository.create(session)

            const found = await repository.findById('s4')
            expect(found?.status).toBe(SESSION_STATUS.DONE)
        })

        it('restores usage', async () => {
            const session = makeSession('s5')
            session.setUsage({ promptTokens: 10, completionTokens: 5, totalTokens: 15 })
            await repository.create(session)

            const found = await repository.findById('s5')
            expect(found?.usage.totalTokens).toBe(15)
        })

        it('restores non-system messages', async () => {
            const session = makeSession('s6')
            session.setMessages([userMsg('m1', 'Hello'), assistantMsg('m2', 'Hi')])
            await repository.create(session)

            const found = await repository.findById('s6')
            expect(found?.getMessages()).toHaveLength(2)
        })

        it('excludes SYSTEM messages when persisting', async () => {
            const session = makeSession('s7')
            session.setMessages([systemMsg('sys', 'You are an assistant.'), userMsg('m1', 'Hello')])
            await repository.create(session)

            const found = await repository.findById('s7')
            const roles = found?.getMessages().map(m => m.role)
            expect(roles).not.toContain(MESSAGE_ROLE.SYSTEM)
            expect(roles).toContain(MESSAGE_ROLE.USER)
        })

        it('throws when the session file contains malformed JSON', async () => {
            await writeFile(join(testDir, 'broken.json'), '{not valid json', 'utf-8')
            await expect(repository.findById('broken')).rejects.toThrow(
                '[JsonSessionRepository] Failed to parse session file for id "broken"'
            )
        })

        it('restores createdAt timestamp', async () => {
            const now = Date.now()
            const session = new Session('s8', [], { contextWindow: 1_000_000, createdAt: now })
            await repository.create(session)

            const found = await repository.findById('s8')
            expect(found?.createdAt).toBe(now)
        })
    })

    describe('update()', () => {
        it('overwrites an existing session', async () => {
            const session = makeSession('upd')
            await repository.create(session)

            session.setStatus(SESSION_STATUS.ERROR)
            await repository.update('upd', session)

            const found = await repository.findById('upd')
            expect(found?.status).toBe(SESSION_STATUS.ERROR)
        })

        it('returns the updated session', async () => {
            const session = makeSession('ret')
            await repository.create(session)

            const result = await repository.update('ret', session)
            expect(result).toBe(session)
        })

        it('throws when the session does not exist', async () => {
            const session = makeSession('missing')
            await expect(repository.update('missing', session)).rejects.toThrow()
        })
    })

    describe('delete()', () => {
        it('removes the session so findById returns null', async () => {
            const session = makeSession('del')
            await repository.create(session)

            await repository.delete('del')
            expect(await repository.findById('del')).toBeNull()
        })

        it('excludes deleted session from findAll results', async () => {
            await repository.create(makeSession('keep'))
            await repository.create(makeSession('remove'))

            await repository.delete('remove')
            const all = await repository.findAll()
            expect(all).toHaveLength(1)
            expect(all[0]?.id).toBe('keep')
        })

        it('is a no-op when session does not exist', async () => {
            await repository.create(makeSession('keep'))
            await repository.delete('nonexistent')

            expect(await repository.findAll()).toHaveLength(1)
        })
    })
})
