import { randomUUID } from 'crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import {
    WorkFlowRegistryInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRepositoryInterface,
    WorkFlowRunnerInterface,
    WorkFlowNodeRegistryInterface,
    WorkFlowInterface,
    WorkFlowRun,
    deserializeWorkFlow
} from '@workflow'
import { WorkFlowRunEventBus } from '../WorkFlowRunEventBus'
import { serializedWorkFlowSchema, workflowParamsSchema, startRunBodySchema } from '../validators'
import { flattenZodError } from '../../utils'

export class WorkFlowController {
    constructor(
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowRepository: WorkFlowRepositoryInterface,
        private readonly workflowRunRepository: WorkFlowRunRepositoryInterface,
        private readonly runner: WorkFlowRunnerInterface,
        private readonly eventBus: WorkFlowRunEventBus,
        private readonly nodeRegistry: WorkFlowNodeRegistryInterface
    ) {}

    async listWorkFlows(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const workflows = await this.workflowRepository.findAll()

        await reply.status(200).send(
            workflows.map(workflow => ({
                id: workflow.id,
                name: workflow.name,
                ...(workflow.description !== undefined && { description: workflow.description })
            }))
        )
    }

    async getWorkFlow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workflowParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const workflow = await this.workflowRepository.findById(params.data.workflowId)

        if (workflow === null) {
            await reply.status(404).send({ error: `WorkFlow "${params.data.workflowId}" not found` })
            return
        }

        await reply.status(200).send({
            id: workflow.id,
            name: workflow.name,
            ...(workflow.description !== undefined && { description: workflow.description }),
            nodes: workflow.getEntries().map(entry => ({
                id: entry.id,
                type: entry.node.type,
                portMappings: entry.portMappings,
                configOverrides: entry.configOverrides
            })),
            connections: workflow.getConnections()
        })
    }

    async createWorkFlow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = serializedWorkFlowSchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const id = randomUUID()
        const { name, description, entries, connections } = body.data

        const workflow = deserializeWorkFlow(
            {
                id,
                name,
                entries,
                connections,
                ...(description !== undefined && { description })
            },
            this.nodeRegistry
        )

        await this.workflowRepository.create(workflow)
        this.workflowRegistry.register(workflow.id, workflow)

        await reply.status(201).send({ id })
    }

    async updateWorkFlow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workflowParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = serializedWorkFlowSchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const existing = await this.workflowRepository.findById(params.data.workflowId)

        if (existing === null) {
            await reply.status(404).send({ error: `WorkFlow "${params.data.workflowId}" not found` })
            return
        }

        const { name, description, entries, connections } = body.data

        const workflow = deserializeWorkFlow(
            {
                id: params.data.workflowId,
                name,
                entries,
                connections,
                ...(description !== undefined && { description })
            },
            this.nodeRegistry
        )

        await this.workflowRepository.update(params.data.workflowId, workflow)

        if (this.workflowRegistry.has(workflow.id)) {
            this.workflowRegistry.unregister(workflow.id)
        }
        this.workflowRegistry.register(workflow.id, workflow)

        await reply.status(200).send({ id: params.data.workflowId })
    }

    async deleteWorkFlow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workflowParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = await this.workflowRepository.findById(params.data.workflowId)

        if (existing === null) {
            await reply.status(404).send({ error: `WorkFlow "${params.data.workflowId}" not found` })
            return
        }

        await this.workflowRepository.delete(params.data.workflowId)

        if (this.workflowRegistry.has(params.data.workflowId)) {
            this.workflowRegistry.unregister(params.data.workflowId)
        }

        await reply.status(204).send()
    }

    async startRun(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workflowParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = startRunBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body' })
            return
        }

        let workflow: WorkFlowInterface | null

        if (body.data.workflow !== undefined) {
            const validated = serializedWorkFlowSchema.safeParse({
                name: 'inline',
                entries: body.data.workflow.entries,
                connections: body.data.workflow.connections
            })

            if (!validated.success) {
                await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(validated.error) })
                return
            }

            workflow = deserializeWorkFlow(
                {
                    id: params.data.workflowId,
                    name: 'inline',
                    entries: validated.data.entries,
                    connections: validated.data.connections
                },
                this.nodeRegistry
            )
        } else {
            workflow =
                this.workflowRegistry.get(params.data.workflowId) ??
                (await this.workflowRepository.findById(params.data.workflowId))
        }

        if (workflow === null) {
            await reply.status(404).send({ error: `WorkFlow "${params.data.workflowId}" not found` })
            return
        }

        const run = new WorkFlowRun(body.data.input ?? null, workflow)

        await this.workflowRunRepository.create(run)

        const stream = this.runner.run(run)
        this.eventBus.start(run.id, stream)

        await reply.status(201).send({ runId: run.id })
    }
}
