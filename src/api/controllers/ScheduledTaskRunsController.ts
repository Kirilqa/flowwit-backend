import { FastifyReply, FastifyRequest } from 'fastify'
import { ScheduledTaskRunRepositoryInterface } from '@scheduler'
import { ScheduledTaskRunSummary } from '@tool/implementations/scheduler'
import { scheduledTaskRunParamsSchema, listScheduledTaskRunsQuerySchema } from '../validators'

export class ScheduledTaskRunsController {
    constructor(private readonly scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface) {}

    async listScheduledTaskRuns(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const query = listScheduledTaskRunsQuerySchema.safeParse(request.query)

        if (!query.success) {
            await reply.status(400).send({ error: 'Invalid query' })
            return
        }

        const runs =
            query.data.taskId !== undefined
                ? await this.scheduledTaskRunRepository.findByTaskId(query.data.taskId)
                : await this.scheduledTaskRunRepository.findAll()

        const summaries: Array<ScheduledTaskRunSummary> = runs
            .filter(run => query.data.status === undefined || run.status === query.data.status)
            .map(run => ({
                id: run.id,
                taskId: run.taskId,
                status: run.status,
                startedAt: run.startedAt,
                ...(run.completedAt !== undefined && { completedAt: run.completedAt }),
                ...(run.outcome !== undefined && { outcome: run.outcome })
            }))

        await reply.status(200).send(summaries)
    }

    async getScheduledTaskRun(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = scheduledTaskRunParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const run = await this.scheduledTaskRunRepository.findById(params.data.runId)

        if (run === null) {
            await reply.status(404).send({ error: `Scheduled task run "${params.data.runId}" not found` })
            return
        }

        await reply.status(200).send(run)
    }
}
