import { FastifyInstance } from 'fastify'
import { HealthController } from '../controllers/HealthController'

export function healthRoutes(fastify: FastifyInstance, controller: HealthController): void {
    fastify.get('/health', controller.getHealth.bind(controller))
}
