import { FastifyReply, FastifyRequest } from 'fastify'
import { MEMORY_SCOPE, MemoryEntryPatch, MemoryPartition, MemoryRepositoryInterface, MemoryScope } from '@memory'
import { flattenZodError } from '../utils'
import {
    memoryScopeParamsSchema,
    memoryEntryParamsSchema,
    memoryOwnerQuerySchema,
    memoryCreateBodySchema,
    memoryUpdateBodySchema
} from '../validators'

export class MemoryController {
    constructor(private readonly memoryRepository: MemoryRepositoryInterface) {}

    async listMemoryEntries(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = memoryScopeParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const partition = this.buildPartition(params.data.scope, request)

        if (partition === null) {
            await reply.status(400).send({ error: this.missingOwnerMessage(params.data.scope) })
            return
        }

        const entries = await this.memoryRepository.findAll(partition)

        await reply.status(200).send(entries)
    }

    async createMemoryEntry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = memoryScopeParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = memoryCreateBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const partition = this.buildPartition(params.data.scope, request)

        if (partition === null) {
            await reply.status(400).send({ error: this.missingOwnerMessage(params.data.scope) })
            return
        }

        const entry = await this.memoryRepository.create(partition, body.data.content, body.data.pinned ?? false)

        await reply.status(201).send(entry)
    }

    async getMemoryEntry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = memoryEntryParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const partition = this.buildPartition(params.data.scope, request)

        if (partition === null) {
            await reply.status(400).send({ error: this.missingOwnerMessage(params.data.scope) })
            return
        }

        const entry = await this.memoryRepository.findById(partition, params.data.id)

        if (entry === null) {
            await reply.status(404).send({ error: `Memory entry "${params.data.id}" not found` })
            return
        }

        await reply.status(200).send(entry)
    }

    async updateMemoryEntry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = memoryEntryParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const body = memoryUpdateBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        const partition = this.buildPartition(params.data.scope, request)

        if (partition === null) {
            await reply.status(400).send({ error: this.missingOwnerMessage(params.data.scope) })
            return
        }

        const existing = await this.memoryRepository.findById(partition, params.data.id)

        if (existing === null) {
            await reply.status(404).send({ error: `Memory entry "${params.data.id}" not found` })
            return
        }

        const patch: MemoryEntryPatch = {
            ...(body.data.content !== undefined && { content: body.data.content }),
            ...(body.data.pinned !== undefined && { pinned: body.data.pinned })
        }

        const entry = await this.memoryRepository.update(partition, params.data.id, patch)

        await reply.status(200).send(entry)
    }

    async deleteMemoryEntry(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = memoryEntryParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const partition = this.buildPartition(params.data.scope, request)

        if (partition === null) {
            await reply.status(400).send({ error: this.missingOwnerMessage(params.data.scope) })
            return
        }

        const existing = await this.memoryRepository.findById(partition, params.data.id)

        if (existing === null) {
            await reply.status(404).send({ error: `Memory entry "${params.data.id}" not found` })
            return
        }

        await this.memoryRepository.delete(partition, params.data.id)

        await reply.status(204).send()
    }

    private buildPartition(scope: MemoryScope, request: FastifyRequest): MemoryPartition | null {
        if (scope === MEMORY_SCOPE.GLOBAL) {
            return { scope }
        }

        const query = memoryOwnerQuerySchema.safeParse(request.query)

        if (!query.success || query.data.owner === undefined) {
            return null
        }

        return { scope, owner: query.data.owner }
    }

    private missingOwnerMessage(scope: MemoryScope): string {
        return `Scope "${scope}" requires an "owner" query parameter`
    }
}
