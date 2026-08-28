import { FastifyInstance } from 'fastify'
import { HumanInputController } from '../controllers/HumanInputController'

export function humanInputRoutes(fastify: FastifyInstance, controller: HumanInputController): void {
    fastify.post('/sessions/:sessionId/human-input', controller.resolve.bind(controller))
}
