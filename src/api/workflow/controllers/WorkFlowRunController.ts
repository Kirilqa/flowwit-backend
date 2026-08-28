import { FastifyReply, FastifyRequest } from 'fastify'
import { WorkFlowRunRepositoryInterface, WorkFlowRunnerInterface } from '@workflow'
import { WorkFlowRunEventBus } from '../WorkFlowRunEventBus'
import { mapWorkFlowEventToSseEvent } from '../utils/mapWorkFlowEventToSseEvent'
import { WORKFLOW_SSE_EVENT_TYPE } from '../types/WorkFlowSseEventType'
import { workFlowRunParamsSchema } from '../validators'

export class WorkFlowRunController {
    constructor(
        private readonly workflowRunRepository: WorkFlowRunRepositoryInterface,
        private readonly runner: WorkFlowRunnerInterface,
        private readonly eventBus: WorkFlowRunEventBus
    ) {}

    async listRuns(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const runs = await this.workflowRunRepository.findAll()

        await reply.status(200).send(
            runs.map(run => ({
                id: run.id,
                workflowId: run.workflowId,
                status: run.status,
                input: run.input,
                createdAt: run.createdAt,
                updatedAt: run.updatedAt
            }))
        )
    }

    async getRun(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workFlowRunParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const run = await this.workflowRunRepository.findById(params.data.runId)

        if (run === null) {
            await reply.status(404).send({ error: `Run "${params.data.runId}" not found` })
            return
        }

        const entries = run.getEntries()

        const nodes = entries.map(entry => ({
            id: entry.id,
            type: entry.node.type,
            portMappings: entry.portMappings,
            configOverrides: entry.configOverrides
        }))

        const nodeStates = entries.reduce<Record<string, { executions: Array<Record<string, unknown>> }>>(
            (accumulator, entry) => {
                accumulator[entry.id] = {
                    executions: Object.values(entry.executions).map(execution => ({
                        executionId: execution.executionId,
                        status: execution.status,
                        input: execution.resolvedPorts ?? {},
                        config: execution.resolvedConfig ?? {},
                        ...(execution.output !== undefined && { output: execution.output }),
                        ...(execution.error !== undefined && { error: execution.error }),
                        ...(execution.startedAt !== undefined && { startedAt: execution.startedAt }),
                        ...(execution.completedAt !== undefined && { completedAt: execution.completedAt })
                    }))
                }

                return accumulator
            },
            {}
        )

        await reply.status(200).send({
            id: run.id,
            workflowId: run.workflowId,
            status: run.status,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            input: run.input,
            output: run.getOutput(),
            workflow: {
                nodes,
                connections: run.getConnections()
            },
            nodeStates
        })
    }

    async streamRunEvents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workFlowRunParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const { runId } = params.data

        if (!this.eventBus.hasRun(runId)) {
            const run = await this.workflowRunRepository.findById(runId)

            if (run === null) {
                await reply.status(404).send({ error: `Run "${runId}" not found` })
                return
            }
        }

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        })

        const writeSse = (event: string, data: unknown): void => {
            reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }

        try {
            for await (const workflowEvent of this.eventBus.subscribe(runId)) {
                const sseEvent = mapWorkFlowEventToSseEvent(workflowEvent)

                if (sseEvent !== null) {
                    writeSse(sseEvent.event, sseEvent.data)
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error'
            writeSse(WORKFLOW_SSE_EVENT_TYPE.ERROR, { message })
        } finally {
            reply.raw.end()
        }
    }

    async stopRun(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = workFlowRunParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        await this.runner.stop(params.data.runId)

        const deadline = Date.now() + 5000
        while (this.eventBus.isActive(params.data.runId) && Date.now() < deadline) {
            await new Promise<void>(resolve => setTimeout(resolve, 50))
        }

        await reply.status(204).send()
    }
}
