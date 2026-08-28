import { FastifyInstance } from 'fastify'
import { ScheduledTasksController } from '../controllers/ScheduledTasksController'

export function scheduledTaskRoutes(fastify: FastifyInstance, controller: ScheduledTasksController): void {
    fastify.get('/scheduled-tasks', (request, reply) => controller.listScheduledTasks(request, reply))
    fastify.post('/scheduled-tasks', (request, reply) => controller.createScheduledTask(request, reply))
    fastify.get('/scheduled-tasks/:taskId', (request, reply) => controller.getScheduledTask(request, reply))
    fastify.put('/scheduled-tasks/:taskId', (request, reply) => controller.updateScheduledTask(request, reply))
    fastify.delete('/scheduled-tasks/:taskId', (request, reply) => controller.deleteScheduledTask(request, reply))
    fastify.post('/scheduled-tasks/:taskId/pause', (request, reply) => controller.pauseScheduledTask(request, reply))
    fastify.post('/scheduled-tasks/:taskId/resume', (request, reply) => controller.resumeScheduledTask(request, reply))
    fastify.post('/scheduled-tasks/:taskId/run', (request, reply) => controller.runScheduledTaskNow(request, reply))
}
