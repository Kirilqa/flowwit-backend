import { FastifyInstance } from 'fastify'
import { ChannelsController } from '../controllers/ChannelsController'

export function channelRoutes(fastify: FastifyInstance, controller: ChannelsController): void {
    fastify.get('/channels', (request, reply) => controller.listChannels(request, reply))
    fastify.get('/channels/:id/settings', (request, reply) => controller.getChannelSettings(request, reply))
    fastify.put('/channels/:id/settings', (request, reply) => controller.updateChannelSettings(request, reply))
}
