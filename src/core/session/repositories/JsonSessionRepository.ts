import { mkdir, readFile, readdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { MESSAGE_ROLE } from '@provider'
import { SessionInterface } from '../interfaces'
import { SessionRepositoryInterface } from '../interfaces/repositories'
import { SessionFactory, SerializedSession } from '../types'

export class JsonSessionRepository implements SessionRepositoryInterface {
    constructor(
        private readonly directory: string,
        private readonly factory: SessionFactory
    ) {}

    async findAll(): Promise<Array<SessionInterface>> {
        let files: Array<string>

        try {
            files = await readdir(this.directory)
        } catch {
            return []
        }

        const sessionFiles = files.filter(file => file.endsWith('.json'))

        const sessions = await Promise.all(
            sessionFiles.map(async file => {
                const sessionId = file.replace('.json', '')
                return this.findById(sessionId)
            })
        )

        return sessions.filter((session): session is SessionInterface => session !== null)
    }

    async findById(id: string): Promise<SessionInterface | null> {
        let raw: string

        try {
            raw = await readFile(this.buildFilePath(id), 'utf-8')
        } catch {
            return null
        }

        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`[JsonSessionRepository] Failed to parse session file for id "${id}"`)
        }

        return this.hydrate(parsed)
    }

    async ensureInitialized(): Promise<void> {
        await mkdir(this.directory, { recursive: true })
    }

    async create(session: SessionInterface): Promise<SessionInterface> {
        await this.ensureInitialized()
        await this.persist(session)
        return session
    }

    async update(id: string, session: SessionInterface): Promise<SessionInterface> {
        const existing = await this.findById(id)

        if (existing === null) {
            throw new Error(`[JsonSessionRepository] Session "${id}" not found`)
        }

        await this.ensureInitialized()
        await this.persist(session)
        return session
    }

    async delete(id: string): Promise<void> {
        try {
            await unlink(this.buildFilePath(id))
        } catch {}
    }

    private hydrate(raw: unknown): SessionInterface {
        const data = raw as SerializedSession

        const session = this.factory(data.id, {
            ...(data.title !== undefined && { title: data.title }),
            contextWindow: data.contextWindow,
            ...(data.workingDirectory !== undefined && { workingDirectory: data.workingDirectory }),
            createdAt: data.createdAt
        })

        session.setMessages(data.messages)
        session.setUsage(data.usage)
        session.setStatus(data.status)

        return session
    }

    private dehydrate(session: SessionInterface): SerializedSession {
        return {
            id: session.id,
            status: session.status,
            title: session.title,
            usage: session.usage,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            contextWindow: session.contextWindow,
            workingDirectory: session.workingDirectory,
            messages: session.getMessages().filter(message => message.role !== MESSAGE_ROLE.SYSTEM)
        }
    }

    private async persist(session: SessionInterface): Promise<void> {
        const serialized = this.dehydrate(session)
        await writeFile(this.buildFilePath(session.id), JSON.stringify(serialized, null, 4), 'utf-8')
    }

    private buildFilePath(id: string): string {
        return join(this.directory, `${id}.json`)
    }
}
