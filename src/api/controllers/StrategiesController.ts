import { FastifyReply, FastifyRequest } from 'fastify'
import { ThinkingStrategyRegistryInterface } from '@strategy'

export class StrategiesController {
    constructor(private readonly strategyRegistry: ThinkingStrategyRegistryInterface) {}

    async listStrategies(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const strategies = this.strategyRegistry.list().map(strategy => ({
            name: strategy.name
        }))

        await reply.status(200).send(strategies)
    }
}
