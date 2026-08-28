import { FastifyInstance } from 'fastify'
import { WorkFlowController } from '../controllers/WorkFlowController'

export function workflowRoutes(fastify: FastifyInstance, controller: WorkFlowController): void {
    fastify.get('/workflows', (request, reply) => controller.listWorkFlows(request, reply))
    fastify.post('/workflows', (request, reply) => controller.createWorkFlow(request, reply))
    fastify.get('/workflows/:workflowId', (request, reply) => controller.getWorkFlow(request, reply))
    fastify.put('/workflows/:workflowId', (request, reply) => controller.updateWorkFlow(request, reply))
    fastify.delete('/workflows/:workflowId', (request, reply) => controller.deleteWorkFlow(request, reply))
    fastify.post('/workflows/:workflowId/run', (request, reply) => controller.startRun(request, reply))
}
