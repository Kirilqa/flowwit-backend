import { FastifyReply, FastifyRequest } from 'fastify'
import { GuardrailRegistryInterface } from '@guardrail'

export class GuardrailsController {
    constructor(private readonly guardrailRegistry: GuardrailRegistryInterface) {}

    async listGuardrails(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const guardrails = this.guardrailRegistry.list()

        await reply.status(200).send(guardrails.map(guardrail => ({ id: guardrail.id })))
    }
}
