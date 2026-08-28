import { FastifyReply, FastifyRequest } from 'fastify'

export class HealthController {
    async getHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        await reply.status(200).send({ status: 'ok', timestamp: Date.now() })
    }
}
