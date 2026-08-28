import { FastifyReply, FastifyRequest } from 'fastify'
import { SessionManagerInterface } from '@session'
import { GuardrailRulesStoreInterface } from '@guardrail'
import { MESSAGE_ROLE } from '@provider'
import { sessionParamsSchema, workingDirectoryBodySchema } from '../validators'

export class SessionsController {
    constructor(
        private readonly sessionManager: SessionManagerInterface,
        private readonly guardrailRulesStore: GuardrailRulesStoreInterface
    ) {}

    async listSessions(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const sessions = await this.sessionManager.list()

        await reply.status(200).send(
            sessions
                .filter(session => !session.temporary)
                .map(session => ({
                    id: session.id,
                    title: session.title,
                    status: session.status,
                    workingDirectory: session.workingDirectory,
                    usage: session.usage,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                }))
        )
    }

    async getSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = sessionParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const session = await this.sessionManager.get(params.data.sessionId)

        if (!session) {
            await reply.status(404).send({ error: `Session "${params.data.sessionId}" not found` })
            return
        }

        await reply.status(200).send({
            id: session.id,
            title: session.title,
            status: session.status,
            workingDirectory: session.workingDirectory,
            usage: session.usage,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        })
    }

    async deleteSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = sessionParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const session = await this.sessionManager.get(params.data.sessionId)

        if (!session) {
            await reply.status(404).send({ error: `Session "${params.data.sessionId}" not found` })
            return
        }

        await this.sessionManager.delete(params.data.sessionId)
        await this.guardrailRulesStore.clearSessionRules(params.data.sessionId)
        await reply.status(204).send()
    }

    async getMessages(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = sessionParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const session = await this.sessionManager.get(params.data.sessionId)

        if (!session) {
            await reply.status(404).send({ error: `Session "${params.data.sessionId}" not found` })
            return
        }

        const messages = session.getMessages().filter(message => message.role !== MESSAGE_ROLE.SYSTEM)

        await reply.status(200).send(messages)
    }

    async setWorkingDirectory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = sessionParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = workingDirectoryBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        const session = await this.sessionManager.get(params.data.sessionId)

        if (!session) {
            await reply.status(404).send({ error: `Session "${params.data.sessionId}" not found` })
            return
        }

        session.setWorkingDirectory(body.data.directory)
        await this.sessionManager.save(session)
        await reply.status(204).send()
    }

    async clearWorkingDirectory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = sessionParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const session = await this.sessionManager.get(params.data.sessionId)

        if (!session) {
            await reply.status(404).send({ error: `Session "${params.data.sessionId}" not found` })
            return
        }

        session.clearWorkingDirectory()
        await this.sessionManager.save(session)
        await reply.status(204).send()
    }
}
