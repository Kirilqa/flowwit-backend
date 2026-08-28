import { FastifyInstance } from 'fastify'
import { ScheduledTaskRunsController } from '../controllers/ScheduledTaskRunsController'

export function scheduledTaskRunRoutes(fastify: FastifyInstance, controller: ScheduledTaskRunsController): void {
    fastify.get('/scheduled-task-runs', (request, reply) => controller.listScheduledTaskRuns(request, reply))
    fastify.get('/scheduled-task-runs/:runId', (request, reply) => controller.getScheduledTaskRun(request, reply))
}
