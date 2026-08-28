import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { MCPClientFactory, MCPServerConfig, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { getErrorMessage } from '@core/utils'
import { flattenZodError } from '../utils'
import { mcpAliasParamsSchema, mcpBodySchema } from '../validators'

export class MCPServersController {
    constructor(
        private readonly mcpServerRegistry: MCPServerRegistryInterface,
        private readonly mcpConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpClientFactory: MCPClientFactory
    ) {}

    async listMCPServers(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const servers = this.mcpServerRegistry.list().map(client => ({
            alias: client.alias,
            type: client.getConfig().type,
            status: client.getStatus()
        }))

        await reply.status(200).send(servers)
    }

    async getMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = mcpAliasParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const client = this.mcpServerRegistry.get(params.data.alias)

        if (client === null) {
            await reply.status(404).send({ error: `MCP server "${params.data.alias}" not found` })
            return
        }

        const config = client.getConfig()

        await reply.status(200).send({
            alias: client.alias,
            status: client.getStatus(),
            ...config
        })
    }

    async createMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = mcpBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const existing = await this.mcpConfigRepository.findById(body.data.name)

        if (existing !== null) {
            await reply.status(409).send({ error: `MCP server "${body.data.name}" already exists` })
            return
        }

        const config = this.buildConfig(body.data)
        await this.mcpConfigRepository.create(config)

        const client = this.mcpClientFactory(config)
        this.mcpServerRegistry.register(client.alias, client)

        await reply.status(201).send({ alias: client.alias })
    }

    async updateMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = mcpAliasParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = mcpBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const existing = await this.mcpConfigRepository.findById(params.data.alias)

        if (existing === null) {
            await reply.status(404).send({ error: `MCP server "${params.data.alias}" not found` })
            return
        }

        const config = this.buildConfig({ ...body.data, name: params.data.alias })
        await this.mcpConfigRepository.update(params.data.alias, config)

        if (this.mcpServerRegistry.has(params.data.alias)) {
            this.mcpServerRegistry.unregister(params.data.alias)
        }

        const client = this.mcpClientFactory(config)
        this.mcpServerRegistry.register(client.alias, client)

        await reply.status(200).send({ alias: params.data.alias })
    }

    async deleteMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = mcpAliasParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = await this.mcpConfigRepository.findById(params.data.alias)

        if (existing === null) {
            await reply.status(404).send({ error: `MCP server "${params.data.alias}" not found` })
            return
        }

        await this.mcpConfigRepository.delete(params.data.alias)

        if (this.mcpServerRegistry.has(params.data.alias)) {
            this.mcpServerRegistry.unregister(params.data.alias)
        }

        await reply.status(204).send()
    }

    async connectMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = mcpAliasParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const client = this.mcpServerRegistry.get(params.data.alias)

        if (client === null) {
            await reply.status(404).send({ error: `MCP server "${params.data.alias}" not found` })
            return
        }

        try {
            await client.connect()
        } catch (error) {
            await reply.status(500).send({ error: getErrorMessage(error) })
            return
        }

        await reply.status(200).send({ alias: params.data.alias, status: client.getStatus() })
    }

    async disconnectMCPServer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = mcpAliasParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const client = this.mcpServerRegistry.get(params.data.alias)

        if (client === null) {
            await reply.status(404).send({ error: `MCP server "${params.data.alias}" not found` })
            return
        }

        try {
            await client.disconnect()
        } catch (error) {
            await reply.status(500).send({ error: getErrorMessage(error) })
            return
        }

        await reply.status(200).send({ alias: params.data.alias, status: client.getStatus() })
    }

    private buildConfig(data: z.infer<typeof mcpBodySchema>): MCPServerConfig {
        if (data.type === 'stdio') {
            return {
                name: data.name,
                type: 'stdio',
                command: data.command,
                ...(data.args !== undefined && { args: data.args }),
                ...(data.env !== undefined && { env: data.env })
            }
        }

        return {
            name: data.name,
            type: data.type,
            url: data.url,
            ...(data.headers !== undefined && { headers: data.headers })
        }
    }
}
