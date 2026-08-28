import { FastifyInstance } from 'fastify'
import { ProvidersController } from '../controllers/ProvidersController'

export function providerRoutes(fastify: FastifyInstance, controller: ProvidersController): void {
    fastify.get('/providers', (request, reply) => controller.listProviders(request, reply))
    fastify.get('/providers/:name/models', (request, reply) => controller.listModels(request, reply))
}
