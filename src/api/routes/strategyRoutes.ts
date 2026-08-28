import { FastifyInstance } from 'fastify'
import { StrategiesController } from '../controllers/StrategiesController'

export function strategyRoutes(fastify: FastifyInstance, controller: StrategiesController): void {
    fastify.get('/strategies', (request, reply) => controller.listStrategies(request, reply))
}
