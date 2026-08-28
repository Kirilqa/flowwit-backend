import { FastifyReply, FastifyRequest } from 'fastify'
import { ProviderRegistryInterface } from '@provider'
import { providerParamsSchema } from '../validators'

export class ProvidersController {
    constructor(private readonly providerRegistry: ProviderRegistryInterface) {}

    async listProviders(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const providers = this.providerRegistry.list().map(provider => ({
            name: provider.name
        }))

        await reply.status(200).send(providers)
    }

    async listModels(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = providerParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const provider = this.providerRegistry.get(params.data.name)

        if (provider === null) {
            await reply.status(404).send({ error: `Provider "${params.data.name}" not found` })
            return
        }

        const models = await provider.listModels()

        await reply.status(200).send(models)
    }
}
