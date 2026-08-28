import { randomUUID } from 'crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import { getErrorMessage } from '@core/utils'
import { flattenZodError } from '../utils'
import { AgentRegistryInterface } from '@agent'
import { SessionManagerInterface } from '@session'
import { SkillRegistryInterface } from '@skill'
import { WorkFlowRegistryInterface } from '@workflow'
import {
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_SESSION_MODE,
    ScheduledTask,
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface,
    ScheduledTaskRunRepositoryInterface,
    SchedulerInterface
} from '@scheduler'
import { computeInitialNextFireAt, validateScheduledTaskExecution } from '@tool/implementations/scheduler'
import { taskParamsSchema, taskBodySchema } from '../validators'

export class ScheduledTasksController {
    constructor(
        private readonly scheduledTaskRegistry: ScheduledTaskRegistryInterface,
        private readonly scheduledTaskRepository: ScheduledTaskRepositoryInterface,
        private readonly scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface,
        private readonly scheduler: SchedulerInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly sessionManager: SessionManagerInterface
    ) {}

    async listScheduledTasks(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        await reply.status(200).send(this.scheduledTaskRegistry.list())
    }

    async getScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const task = this.scheduledTaskRegistry.get(params.data.taskId)

        if (task === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        await reply.status(200).send(task)
    }

    async createScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const body = taskBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        try {
            validateScheduledTaskExecution(
                body.data.execution,
                this.agentRegistry,
                this.workflowRegistry,
                this.skillRegistry
            )
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        const task: ScheduledTask = {
            id: randomUUID(),
            schedule: body.data.schedule,
            execution: body.data.execution,
            destination: body.data.destination,
            nextFireAt: computeInitialNextFireAt(body.data.schedule),
            enabled: true
        }

        await this.scheduledTaskRepository.create(task)
        this.scheduledTaskRegistry.register(task.id, task)

        await reply.status(201).send(task)
    }

    async updateScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = this.scheduledTaskRegistry.get(params.data.taskId)

        if (existing === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        const body = taskBodySchema.safeParse(request.body)

        if (!body.success) {
            await reply.status(400).send({ error: 'Invalid body', details: flattenZodError(body.error) })
            return
        }

        try {
            validateScheduledTaskExecution(
                body.data.execution,
                this.agentRegistry,
                this.workflowRegistry,
                this.skillRegistry
            )
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        const updated: ScheduledTask = {
            id: params.data.taskId,
            schedule: body.data.schedule,
            execution: body.data.execution,
            destination: body.data.destination,
            nextFireAt: computeInitialNextFireAt(body.data.schedule),
            enabled: existing.enabled
        }

        await this.scheduledTaskRepository.update(params.data.taskId, updated)
        this.scheduledTaskRegistry.register(params.data.taskId, updated)

        await reply.status(200).send(updated)
    }

    async deleteScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const task = this.scheduledTaskRegistry.get(params.data.taskId)

        if (task === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        await this.scheduledTaskRepository.delete(params.data.taskId)
        this.scheduledTaskRegistry.unregister(params.data.taskId)

        if (
            task.execution.type === SCHEDULED_TASK_EXECUTION_TYPE.PROMPT &&
            task.execution.sessionMode === SCHEDULED_TASK_SESSION_MODE.PERSISTENT
        ) {
            await this.sessionManager.delete(`scheduler-${params.data.taskId}`)
        }

        const runs = await this.scheduledTaskRunRepository.findByTaskId(params.data.taskId)

        for (const run of runs) {
            await this.scheduledTaskRunRepository.delete(run.id)
        }

        await reply.status(204).send()
    }

    async pauseScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = this.scheduledTaskRegistry.get(params.data.taskId)

        if (existing === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        const updated: ScheduledTask = { ...existing, enabled: false }

        await this.scheduledTaskRepository.update(params.data.taskId, { enabled: false })
        this.scheduledTaskRegistry.register(params.data.taskId, updated)

        await reply.status(200).send(updated)
    }

    async resumeScheduledTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = this.scheduledTaskRegistry.get(params.data.taskId)

        if (existing === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        const nextFireAt = computeInitialNextFireAt(existing.schedule)
        const updated: ScheduledTask = { ...existing, enabled: true, nextFireAt }

        await this.scheduledTaskRepository.update(params.data.taskId, { enabled: true, nextFireAt })
        this.scheduledTaskRegistry.register(params.data.taskId, updated)

        await reply.status(200).send(updated)
    }

    async runScheduledTaskNow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = taskParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        if (this.scheduledTaskRegistry.get(params.data.taskId) === null) {
            await reply.status(404).send({ error: `Scheduled task "${params.data.taskId}" not found` })
            return
        }

        const runId = await this.scheduler.runNow(params.data.taskId)

        await reply.status(201).send({ runId })
    }
}
