import { FastifyInstance } from 'fastify'
import { MemoryController } from '../controllers/MemoryController'

export function memoryRoutes(fastify: FastifyInstance, controller: MemoryController): void {
    fastify.get('/memory/:scope', controller.listMemoryEntries.bind(controller))
    fastify.post('/memory/:scope', controller.createMemoryEntry.bind(controller))
    fastify.get('/memory/:scope/:id', controller.getMemoryEntry.bind(controller))
    fastify.put('/memory/:scope/:id', controller.updateMemoryEntry.bind(controller))
    fastify.delete('/memory/:scope/:id', controller.deleteMemoryEntry.bind(controller))
}
