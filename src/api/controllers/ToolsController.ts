import { FastifyReply, FastifyRequest } from 'fastify'
import { ToolRegistryInterface } from '@tool'
import { toolParamsSchema } from '../validators'

export class ToolsController {
    constructor(private readonly toolRegistry: ToolRegistryInterface) {}

    async listTools(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const tools = this.toolRegistry.list().map(tool => ({
            name: tool.name,
            description: tool.description
        }))

        await reply.status(200).send(tools)
    }

    async getTool(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = toolParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const tool = this.toolRegistry.get(params.data.name)

        if (tool === null) {
            await reply.status(404).send({ error: `Tool "${params.data.name}" not found` })
            return
        }

        await reply.status(200).send({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        })
    }
}
