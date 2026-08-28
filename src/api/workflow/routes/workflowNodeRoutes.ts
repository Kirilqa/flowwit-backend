import { FastifyInstance } from 'fastify'
import { WorkFlowNodeController } from '../controllers/WorkFlowNodeController'

export function workflowNodeRoutes(fastify: FastifyInstance, controller: WorkFlowNodeController): void {
    fastify.get('/nodes', (request, reply) => controller.listNodes(request, reply))
}
