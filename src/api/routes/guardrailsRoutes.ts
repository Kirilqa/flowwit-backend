import { FastifyInstance } from 'fastify'
import { GuardrailsController } from '../controllers/GuardrailsController'

export function guardrailsRoutes(fastify: FastifyInstance, controller: GuardrailsController): void {
    fastify.get('/guardrails', controller.listGuardrails.bind(controller))
}
