import { FastifyInstance } from 'fastify'
import { GuardrailController } from '../controllers/GuardrailController'

export function guardrailRoutes(fastify: FastifyInstance, controller: GuardrailController): void {
    fastify.post('/guardrails/:requestId/confirm', controller.confirm.bind(controller))
}
