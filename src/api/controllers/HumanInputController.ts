import { FastifyReply, FastifyRequest } from 'fastify'
import { HumanInputResolverInterface } from '@tool'
import { humanInputParamsSchema, humanInputBodySchema } from '../validators'

export class HumanInputController {
    constructor(private readonly humanInputResolver: HumanInputResolverInterface) {}

    async resolve(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = humanInputParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = humanInputBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        const { sessionId } = params.data
        const { answer } = body.data

        if (!this.humanInputResolver.isWaiting(sessionId)) {
            await reply.status(409).send({ error: `Session "${sessionId}" is not waiting for human input` })
            return
        }

        this.humanInputResolver.respond(sessionId, answer)

        await reply.status(204).send()
    }
}
