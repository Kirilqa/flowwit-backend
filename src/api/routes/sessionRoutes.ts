import { FastifyInstance } from 'fastify'
import { SessionsController } from '../controllers/SessionsController'

export function sessionRoutes(fastify: FastifyInstance, controller: SessionsController): void {
    fastify.get('/sessions', controller.listSessions.bind(controller))
    fastify.get('/sessions/:sessionId', controller.getSession.bind(controller))
    fastify.delete('/sessions/:sessionId', controller.deleteSession.bind(controller))
    fastify.get('/sessions/:sessionId/messages', controller.getMessages.bind(controller))
    fastify.put('/sessions/:sessionId/working-directory', controller.setWorkingDirectory.bind(controller))
    fastify.delete('/sessions/:sessionId/working-directory', controller.clearWorkingDirectory.bind(controller))
}
