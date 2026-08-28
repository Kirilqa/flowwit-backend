import { FastifyInstance } from 'fastify'
import { CommandsController } from '../controllers/CommandsController'

export function commandRoutes(fastify: FastifyInstance, controller: CommandsController): void {
    fastify.get('/commands', (request, reply) => controller.listCommands(request, reply))
}
