import { randomUUID } from 'crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfig, RawAgentFactory } from '@agent'
import { GuardrailRegistryInterface } from '@guardrail'
import { RawAgentConfigRepositoryInterface } from '@agent/interfaces'
import { getErrorMessage, isValidTimeZone } from '@core/utils'
import { flattenZodError } from '../utils'
import { agentParamsSchema, agentBodySchema } from '../validators'

export class AgentsController {
    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly rawAgentConfigRepository: RawAgentConfigRepositoryInterface,
        private readonly rawAgentFactory: RawAgentFactory,
        private readonly guardrailRegistry: GuardrailRegistryInterface
    ) {}

    async listAgents(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const agents = this.agentRegistry.list().map(agent => ({
            id: agent.config.id,
            name: agent.config.name,
            role: agent.config.role,
            ...(agent.config.description !== undefined && { description: agent.config.description })
        }))

        await reply.status(200).send(agents)
    }

    async getAgent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = agentParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const raw = await this.rawAgentConfigRepository.findById(params.data.agentId)

        if (raw === null) {
            await reply.status(404).send({ error: `Agent "${params.data.agentId}" not found` })
            return
        }

        await reply.status(200).send(this.buildAgentResponse(raw))
    }

    async createAgent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = agentBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const id = randomUUID()

        let raw: RawAgentConfig
        let agent

        try {
            raw = this.buildRawConfig(id, body.data)
            agent = this.rawAgentFactory(raw)
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        await this.rawAgentConfigRepository.create(raw)
        this.agentRegistry.register(agent.config.id, agent)

        await reply.status(201).send({ id })
    }

    async updateAgent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = agentParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = agentBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const existing = await this.rawAgentConfigRepository.findById(params.data.agentId)

        if (existing === null) {
            await reply.status(404).send({ error: `Agent "${params.data.agentId}" not found` })
            return
        }

        let raw: RawAgentConfig
        let freshAgent

        try {
            raw = this.buildRawConfig(params.data.agentId, body.data)
            freshAgent = this.rawAgentFactory(raw)
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        await this.rawAgentConfigRepository.update(params.data.agentId, raw)

        const registeredAgent = this.agentRegistry.get(params.data.agentId)

        if (registeredAgent !== null) {
            registeredAgent.update(freshAgent.config)
        } else {
            this.agentRegistry.register(params.data.agentId, freshAgent)
        }

        await reply.status(200).send({ id: params.data.agentId })
    }

    async deleteAgent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = agentParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = await this.rawAgentConfigRepository.findById(params.data.agentId)

        if (existing === null) {
            await reply.status(404).send({ error: `Agent "${params.data.agentId}" not found` })
            return
        }

        await this.rawAgentConfigRepository.delete(params.data.agentId)

        if (this.agentRegistry.has(params.data.agentId)) {
            this.agentRegistry.unregister(params.data.agentId)
        }

        await reply.status(204).send()
    }

    private buildRawConfig(id: string, body: z.infer<typeof agentBodySchema>): RawAgentConfig {
        for (const guardrailId of Object.keys(body.guardrailRules ?? {})) {
            if (this.guardrailRegistry.get(guardrailId) === null) {
                throw new Error(`Guardrail "${guardrailId}" not found in registry.`)
            }
        }

        if (body.timezone !== undefined && !isValidTimeZone(body.timezone)) {
            throw new Error(`Invalid IANA time zone: "${body.timezone}".`)
        }

        return {
            id,
            name: body.name,
            role: body.role,
            provider: body.provider,
            model: body.model,
            systemPrompt: body.systemPrompt,
            thinkingStrategy: body.thinkingStrategy,
            ...(body.description !== undefined && { description: body.description }),
            ...(body.tools !== undefined && { tools: body.tools }),
            ...(body.skills !== undefined && { skills: body.skills }),
            ...(body.agents !== undefined && { agents: body.agents }),
            ...(body.mcpServers !== undefined && { mcpServers: body.mcpServers }),
            ...(body.workflows !== undefined && { workflows: body.workflows }),
            ...(body.budget !== undefined && {
                budget: {
                    ...(body.budget.maxTokens !== undefined && { maxTokens: body.budget.maxTokens }),
                    ...(body.budget.maxIterations !== undefined && { maxIterations: body.budget.maxIterations }),
                    ...(body.budget.maxToolCalls !== undefined && { maxToolCalls: body.budget.maxToolCalls }),
                    ...(body.budget.maxCostUsd !== undefined && { maxCostUsd: body.budget.maxCostUsd }),
                    ...(body.budget.maxDurationMs !== undefined && { maxDurationMs: body.budget.maxDurationMs })
                }
            }),
            ...(body.temperature !== undefined && { temperature: body.temperature }),
            ...(body.metadata !== undefined && { metadata: body.metadata }),
            ...(body.timezone !== undefined && { timezone: body.timezone }),
            ...(body.guardrailRules !== undefined &&
                Object.keys(body.guardrailRules).length > 0 && { guardrailRules: body.guardrailRules })
        }
    }

    private buildAgentResponse(raw: RawAgentConfig): Record<string, unknown> {
        return {
            id: raw.id,
            name: raw.name,
            role: raw.role,
            provider: raw.provider,
            model: raw.model,
            systemPrompt: raw.systemPrompt,
            thinkingStrategy: raw.thinkingStrategy,
            ...(raw.description !== undefined && { description: raw.description }),
            ...(raw.tools !== undefined && { tools: raw.tools }),
            ...(raw.skills !== undefined && { skills: raw.skills }),
            ...(raw.agents !== undefined && { agents: raw.agents }),
            ...(raw.mcpServers !== undefined && { mcpServers: raw.mcpServers }),
            ...(raw.workflows !== undefined && { workflows: raw.workflows }),
            ...(raw.budget !== undefined && { budget: raw.budget }),
            ...(raw.temperature !== undefined && { temperature: raw.temperature }),
            ...(raw.guardrailRules !== undefined && { guardrailRules: raw.guardrailRules }),
            ...(raw.timezone !== undefined && { timezone: raw.timezone })
        }
    }
}
