import { FastifyInstance } from 'fastify'
import { ToolsController } from '../controllers/ToolsController'

export function toolRoutes(fastify: FastifyInstance, controller: ToolsController): void {
    fastify.get('/tools', (request, reply) => controller.listTools(request, reply))
    fastify.get('/tools/:name', (request, reply) => controller.getTool(request, reply))
}
