import { randomUUID } from 'crypto'
import { z } from 'zod'
import { AgentEvent, AGENT_EVENT_TYPE, AgentRunOptions, ForcedToolCall } from '@agent'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { GUARDRAIL_CHECK_MODE, GuardrailRunPolicy } from '@guardrail'
import { SkillRegistryInterface } from '@skill'
import { AgentSessionError, SessionFactory, SessionInterface, SessionManagerInterface } from '@session'
import { SkillAdapter } from '@tool'
import { ChannelRegistryInterface } from '@channel'
import { MESSAGE_ROLE } from '@provider'
import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import {
    WorkFlowEvent,
    WorkFlowRegistryInterface,
    WorkFlowRun,
    WorkFlowRunnerInterface,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS
} from '@workflow'
import {
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface,
    ScheduledTaskRunRepositoryInterface,
    SchedulerInterface
} from '../interfaces'
import {
    ResolvedScheduledDestination,
    SCHEDULE_SPEC_TYPE,
    SCHEDULED_TASK_DESTINATION_TYPE,
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_GUARDRAIL_POLICY,
    SCHEDULED_TASK_RUN_STATUS,
    SCHEDULED_TASK_SESSION_MODE,
    ScheduledTask,
    ScheduledTaskDestination,
    ScheduledTaskGuardrailPolicy,
    ScheduledTaskPromptExecution,
    ScheduledTaskRun,
    ScheduledTaskRunStatus,
    ScheduledTaskSessionMode,
    ScheduledTaskWorkflowExecution
} from '../types'
import { computeNextFireAfter } from '../utils'
import { scheduledTaskOutcomeSchema } from '../validators'
import { ScheduledDeliveryOutcome, SCHEDULED_DELIVERY_OUTCOME_TYPE } from '@channel'

const TICK_INTERVAL_MS = 1000
const MAX_RUNS_PER_TASK = 100

const DELTA_EVENT_TYPES = new Set<string>([
    AGENT_EVENT_TYPE.THINKING_DELTA,
    AGENT_EVENT_TYPE.MESSAGE_DELTA,
    AGENT_EVENT_TYPE.TOOL_CALL_DELTA,
    AGENT_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA
])

const SCHEDULED_TASK_OUTCOME_JSON_SCHEMA = z.toJSONSchema(scheduledTaskOutcomeSchema, {
    io: 'input'
}) as Record<string, unknown>

export class Scheduler implements SchedulerInterface {
    private timer: NodeJS.Timeout | null = null

    private readonly logger: LoggerInterface

    constructor(
        private readonly registry: ScheduledTaskRegistryInterface,
        private readonly taskRepository: ScheduledTaskRepositoryInterface,
        private readonly runRepository: ScheduledTaskRunRepositoryInterface,
        private readonly agentDispatcher: AgentDispatcherInterface,
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly workflowRegistry: WorkFlowRegistryInterface,
        private readonly workflowRunner: WorkFlowRunnerInterface,
        private readonly channelRegistry: ChannelRegistryInterface,
        private readonly sessionManager: SessionManagerInterface,
        private readonly sessionFactory: SessionFactory,
        logger: LoggerInterface
    ) {
        this.logger = logger.child('Scheduler')
    }

    async start(): Promise<void> {
        await this.recoverInterruptedRuns()
        this.timer = setInterval(() => {
            this.tick()
        }, TICK_INTERVAL_MS)
    }

    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    private tick(): void {
        const now = Date.now()

        for (const task of this.registry.list()) {
            if (!task.enabled) continue
            if (task.nextFireAt > now) continue

            try {
                this.rescheduleDueTask(task, now)
            } catch (error) {
                this.logger.error(`Failed to reschedule task "${task.id}"`, {
                    taskId: task.id,
                    error: getErrorMessage(error)
                })
            }
        }
    }

    private rescheduleDueTask(task: ScheduledTask, now: number): void {
        void this.fireTask(task).catch((error: unknown) => {
            this.logger.error(`Task "${task.id}" failed`, { taskId: task.id, error: getErrorMessage(error) })
        })

        if (task.schedule.type === SCHEDULE_SPEC_TYPE.ONCE) {
            this.registry.unregister(task.id)
            void this.taskRepository.delete(task.id).catch(() => {})
            return
        }

        const nextFireAt = computeNextFireAfter(task.schedule, now)
        const updated: ScheduledTask = { ...task, nextFireAt }

        this.registry.register(task.id, updated)
        void this.taskRepository.update(task.id, { nextFireAt }).catch(() => {})
    }

    async runNow(taskId: string): Promise<string> {
        const task = this.registry.get(taskId)

        if (task === null) {
            throw new Error(`Scheduled task "${taskId}" not found`)
        }

        return this.fireTask(task)
    }

    private async fireTask(task: ScheduledTask): Promise<string> {
        if (task.execution.type === SCHEDULED_TASK_EXECUTION_TYPE.PROMPT) {
            return this.firePromptTask(task, task.execution)
        }

        return this.fireWorkflowTask(task, task.execution)
    }

    private async firePromptTask(task: ScheduledTask, execution: ScheduledTaskPromptExecution): Promise<string> {
        const runId = await this.createRunRecord(task.id)

        void this.executePromptTask(task, execution, runId).catch((error: unknown) => {
            this.logger.error(`Task "${task.id}" failed`, { taskId: task.id, error: getErrorMessage(error) })
        })

        return runId
    }

    private async executePromptTask(
        task: ScheduledTask,
        execution: ScheduledTaskPromptExecution,
        runId: string
    ): Promise<void> {
        let destination: ResolvedScheduledDestination | null = null

        if (task.destination.type !== SCHEDULED_TASK_DESTINATION_TYPE.SILENT) {
            destination = await this.resolveDestination(task.destination)

            if (destination === null) {
                await this.completeRun(runId, SCHEDULED_TASK_RUN_STATUS.FAILED, [], {
                    type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR,
                    text: 'Destination session could not be resolved'
                })
                return
            }
        }

        const executionSession = await this.resolveExecutionSession(task.id, execution.sessionMode)
        const forcedToolCalls = this.buildForcedToolCalls(execution.skills)
        const guardrailPolicy = this.buildGuardrailPolicy(execution.guardrailPolicy)
        const requestsOutcome = destination !== null

        const events: Array<AgentEvent | WorkFlowEvent> = []
        let outcome: ScheduledDeliveryOutcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP }
        let status: ScheduledTaskRunStatus = SCHEDULED_TASK_RUN_STATUS.COMPLETED

        try {
            const runOptions: AgentRunOptions = {
                ...(forcedToolCalls.length > 0 && { forcedToolCalls }),
                ...(requestsOutcome && { outputSchema: SCHEDULED_TASK_OUTCOME_JSON_SCHEMA }),
                guardrailPolicy
            }

            const stream = this.agentDispatcher.send(execution.agentId, executionSession, execution.prompt, runOptions)

            for await (const event of stream) {
                if (DELTA_EVENT_TYPES.has(event.type)) continue

                events.push(event)

                if (event.type === AGENT_EVENT_TYPE.STRUCTURED_OUTPUT && requestsOutcome) {
                    outcome = this.parseStructuredOutcome(event.output)
                }

                if (event.type === AGENT_EVENT_TYPE.ERROR) {
                    outcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: event.error }
                }
            }
        } catch (error) {
            if (error instanceof AgentSessionError) {
                status = SCHEDULED_TASK_RUN_STATUS.SKIPPED
            } else {
                status = SCHEDULED_TASK_RUN_STATUS.FAILED
                outcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: getErrorMessage(error) }
            }
        }

        if (destination !== null && status !== SCHEDULED_TASK_RUN_STATUS.SKIPPED) {
            await this.deliver(destination, outcome)
        }

        await this.completeRun(runId, status, events, outcome)
        this.pruneRunHistory(task.id)
    }

    private async fireWorkflowTask(task: ScheduledTask, execution: ScheduledTaskWorkflowExecution): Promise<string> {
        const runId = await this.createRunRecord(task.id)

        void this.executeWorkflowTask(task, execution, runId).catch((error: unknown) => {
            this.logger.error(`Task "${task.id}" failed`, { taskId: task.id, error: getErrorMessage(error) })
        })

        return runId
    }

    private async executeWorkflowTask(
        task: ScheduledTask,
        execution: ScheduledTaskWorkflowExecution,
        runId: string
    ): Promise<void> {
        let destination: ResolvedScheduledDestination | null = null

        if (task.destination.type !== SCHEDULED_TASK_DESTINATION_TYPE.SILENT) {
            destination = await this.resolveDestination(task.destination)

            if (destination === null) {
                await this.completeRun(runId, SCHEDULED_TASK_RUN_STATUS.FAILED, [], {
                    type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR,
                    text: 'Destination session could not be resolved'
                })
                return
            }
        }

        const workflow = this.workflowRegistry.get(execution.workflowId)

        if (workflow === null) {
            await this.completeRun(runId, SCHEDULED_TASK_RUN_STATUS.FAILED, [], {
                type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR,
                text: `WorkFlow "${execution.workflowId}" not found`
            })
            return
        }

        const run = new WorkFlowRun(execution.input, workflow)
        const events: Array<AgentEvent | WorkFlowEvent> = []
        let failureReason: string | undefined

        for await (const event of this.workflowRunner.run(run)) {
            events.push(event)

            if (event.type === WORKFLOW_EVENT_TYPE.RUN_FAILED) {
                failureReason = event.error
            }
        }

        let status: ScheduledTaskRunStatus = SCHEDULED_TASK_RUN_STATUS.COMPLETED
        let outcome: ScheduledDeliveryOutcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP }

        if (run.status === WORKFLOW_RUN_STATUS.FAILED) {
            status = SCHEDULED_TASK_RUN_STATUS.FAILED
            outcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: failureReason ?? 'WorkFlow run failed' }
        } else if (destination !== null) {
            outcome = { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE, text: JSON.stringify(run.getOutput(), null, 2) }
        }

        if (destination !== null) {
            await this.deliver(destination, outcome)
        }

        await this.completeRun(runId, status, events, outcome)
        this.pruneRunHistory(task.id)
    }

    private pruneRunHistory(taskId: string): void {
        void this.runRepository.pruneOldest(taskId, MAX_RUNS_PER_TASK).catch((error: unknown) => {
            this.logger.error(`Failed to prune run history for task "${taskId}"`, {
                taskId,
                error: getErrorMessage(error)
            })
        })
    }

    private async deliver(destination: ResolvedScheduledDestination, outcome: ScheduledDeliveryOutcome): Promise<void> {
        if (outcome.type !== SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP) {
            destination.session.addMessage({
                id: randomUUID(),
                role: MESSAGE_ROLE.ASSISTANT,
                content: outcome.text,
                createdAt: Date.now()
            })

            await this.sessionManager.save(destination.session)
        }

        if (destination.channel.send !== undefined) {
            await destination.channel.send(outcome, destination.session, destination.options)
        }
    }

    private async resolveDestination(
        destination: ScheduledTaskDestination
    ): Promise<ResolvedScheduledDestination | null> {
        if (destination.type === SCHEDULED_TASK_DESTINATION_TYPE.SILENT) return null

        const channel = this.channelRegistry.get(destination.type)

        if (channel?.resolveSession === undefined) return null

        const options: Record<string, unknown> =
            destination.type === SCHEDULED_TASK_DESTINATION_TYPE.TELEGRAM
                ? { chatId: destination.chatId }
                : { sessionId: destination.sessionId }

        const session = await channel.resolveSession(options)

        if (session === null) return null

        return { channel, session, options }
    }

    private async resolveExecutionSession(
        taskId: string,
        sessionMode: ScheduledTaskSessionMode
    ): Promise<SessionInterface> {
        if (sessionMode === SCHEDULED_TASK_SESSION_MODE.EPHEMERAL) {
            return this.sessionFactory(randomUUID())
        }

        const persistentSessionId = `scheduler-${taskId}`
        const existing = await this.sessionManager.get(persistentSessionId)

        if (existing !== null) return existing

        return this.sessionManager.create(persistentSessionId)
    }

    private buildForcedToolCalls(skillNames: Array<string> | undefined): Array<ForcedToolCall> {
        const calls: Array<ForcedToolCall> = []

        for (const skillName of skillNames ?? []) {
            const skill = this.skillRegistry.get(skillName)

            if (skill === null) {
                this.logger.warn(`Skill "${skillName}" not found, skipping`, { skillName })
                continue
            }

            calls.push({ tool: new SkillAdapter(skill), arguments: {}, bypassGuardrails: true })
        }

        return calls
    }

    private buildGuardrailPolicy(policy: ScheduledTaskGuardrailPolicy | undefined): GuardrailRunPolicy {
        const mode =
            policy === SCHEDULED_TASK_GUARDRAIL_POLICY.FAIL ? GUARDRAIL_CHECK_MODE.FAIL : GUARDRAIL_CHECK_MODE.SAFE_SKIP

        return { input: mode, output: mode, toolCall: mode }
    }

    private parseStructuredOutcome(output: unknown): ScheduledDeliveryOutcome {
        const result = scheduledTaskOutcomeSchema.safeParse(output)

        if (!result.success) {
            return { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: 'Agent returned an invalid structured outcome' }
        }

        if (result.data.action === 'skip') {
            return { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP }
        }

        return { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE, text: result.data.message }
    }

    private async createRunRecord(taskId: string): Promise<string> {
        const run: ScheduledTaskRun = {
            id: randomUUID(),
            taskId,
            status: SCHEDULED_TASK_RUN_STATUS.RUNNING,
            startedAt: Date.now(),
            events: []
        }

        await this.runRepository.create(run)
        return run.id
    }

    private async completeRun(
        runId: string,
        status: ScheduledTaskRunStatus,
        events: Array<AgentEvent | WorkFlowEvent>,
        outcome: ScheduledDeliveryOutcome
    ): Promise<void> {
        await this.runRepository.update(runId, {
            status,
            completedAt: Date.now(),
            events,
            outcome
        })
    }

    private async recoverInterruptedRuns(): Promise<void> {
        const runs = await this.runRepository.findAll()

        for (const run of runs) {
            if (run.status !== SCHEDULED_TASK_RUN_STATUS.RUNNING) continue

            await this.runRepository.update(run.id, {
                status: SCHEDULED_TASK_RUN_STATUS.INTERRUPTED,
                completedAt: Date.now()
            })
        }
    }
}
