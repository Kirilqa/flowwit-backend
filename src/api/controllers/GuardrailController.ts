import { FastifyReply, FastifyRequest } from 'fastify'
import { GuardrailResolverInterface } from '@guardrail'
import { guardrailConfirmParamsSchema, guardrailConfirmBodySchema } from '../validators'

export class GuardrailController {
    constructor(private readonly resolver: GuardrailResolverInterface) {}

    async confirm(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = guardrailConfirmParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = guardrailConfirmBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        this.resolver.resolve(params.data.requestId, body.data.decision)

        await reply.status(204).send()
    }
}
