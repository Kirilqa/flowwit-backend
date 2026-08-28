import { FastifyInstance } from 'fastify'
import { WorkFlowRunController } from '../controllers/WorkFlowRunController'

export function workflowRunRoutes(fastify: FastifyInstance, controller: WorkFlowRunController): void {
    fastify.get('/runs', (request, reply) => controller.listRuns(request, reply))
    fastify.get('/runs/:runId', (request, reply) => controller.getRun(request, reply))
    fastify.get('/runs/:runId/events', (request, reply) => controller.streamRunEvents(request, reply))
    fastify.delete('/runs/:runId', (request, reply) => controller.stopRun(request, reply))
}
