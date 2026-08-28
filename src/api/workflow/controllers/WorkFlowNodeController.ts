import { FastifyReply, FastifyRequest } from 'fastify'
import { WorkFlowNodeRegistryInterface } from '@workflow'

export class WorkFlowNodeController {
    constructor(private readonly nodeRegistry: WorkFlowNodeRegistryInterface) {}

    async listNodes(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const nodes = this.nodeRegistry.list()

        await reply.status(200).send(
            nodes.map(node => ({
                type: node.type,
                isStart: node.isStart,
                ports: node.portsJsonSchema,
                outputs: node.outputsJsonSchema,
                configSchema: node.configJsonSchema
            }))
        )
    }
}
