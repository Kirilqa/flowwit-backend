import { FastifyInstance } from 'fastify'
import { AgentsController } from '../controllers/AgentsController'

export function agentRoutes(fastify: FastifyInstance, controller: AgentsController): void {
    fastify.get('/agents', (request, reply) => controller.listAgents(request, reply))
    fastify.post('/agents', (request, reply) => controller.createAgent(request, reply))
    fastify.get('/agents/:agentId', (request, reply) => controller.getAgent(request, reply))
    fastify.put('/agents/:agentId', (request, reply) => controller.updateAgent(request, reply))
    fastify.delete('/agents/:agentId', (request, reply) => controller.deleteAgent(request, reply))
}
