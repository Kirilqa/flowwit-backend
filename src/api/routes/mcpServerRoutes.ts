import { FastifyInstance } from 'fastify'
import { MCPServersController } from '../controllers/MCPServersController'

export function mcpServerRoutes(fastify: FastifyInstance, controller: MCPServersController): void {
    fastify.get('/mcp-servers', (request, reply) => controller.listMCPServers(request, reply))
    fastify.post('/mcp-servers', (request, reply) => controller.createMCPServer(request, reply))
    fastify.get('/mcp-servers/:alias', (request, reply) => controller.getMCPServer(request, reply))
    fastify.put('/mcp-servers/:alias', (request, reply) => controller.updateMCPServer(request, reply))
    fastify.delete('/mcp-servers/:alias', (request, reply) => controller.deleteMCPServer(request, reply))
    fastify.post('/mcp-servers/:alias/connect', (request, reply) => controller.connectMCPServer(request, reply))
    fastify.post('/mcp-servers/:alias/disconnect', (request, reply) => controller.disconnectMCPServer(request, reply))
}
