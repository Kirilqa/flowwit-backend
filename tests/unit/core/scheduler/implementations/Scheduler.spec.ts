import { randomUUID } from 'crypto'
import { Scheduler } from '@scheduler/implementations/Scheduler'
import {
    ScheduledTaskRunRepositoryInterface,
    SCHEDULE_SPEC_TYPE,
    SCHEDULED_TASK_DESTINATION_TYPE,
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_SESSION_MODE,
    SCHEDULED_TASK_RUN_STATUS,
    SCHEDULED_TASK_GUARDRAIL_POLICY,
    ScheduledTask,
    ScheduledTaskRun
} from '@scheduler'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { GUARDRAIL_CHECK_MODE } from '@guardrail'
import { AgentSessionError, SessionInterface } from '@session'
import { Session } from '@session/implementations/session/Session'
import { makeSessionManager, makeSkillMock } from '../../../../helpers/makeAgent'
import {
    makeScheduledTask as makeTask,
    makeTaskRegistry,
    makeTaskRepository
} from '../../../../helpers/makeScheduledTask'
import { makeScheduledTaskRun as makeRun } from '../../../../helpers/makeScheduledTaskRun'
import { Skill, SkillRegistryInterface } from '@skill'
import { AgentEvent, AGENT_EVENT_TYPE } from '@agent'
import {
    WorkFlowEvent,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS,
    WorkFlowInterface,
    WorkFlowRegistryInterface,
    WorkFlowRunInterface,
    WorkFlowRunnerInterface
} from '@workflow'
import { ChannelInterface, ChannelRegistryInterface, SCHEDULED_DELIVERY_OUTCOME_TYPE } from '@channel'
import { NoopLogger } from '@logger'
import { LoggerInterface } from '@logger/interfaces'

const MAX_RUNS_PER_TASK = 100

function makeRunRepository(initialRuns: Array<ScheduledTaskRun> = []): ScheduledTaskRunRepositoryInterface {
    const runs = new Map(initialRuns.map(r => [r.id, r]))
    return {
        findAll: jest.fn(() => Promise.resolve([...runs.values()])),
        findById: jest.fn((id: string) => Promise.resolve(runs.get(id) ?? null)),
        findByTaskId: jest.fn((taskId: string) => Promise.resolve([...runs.values()].filter(r => r.taskId === taskId))),
        create: jest.fn((run: ScheduledTaskRun) => {
            runs.set(run.id, run)
            return Promise.resolve(run)
        }),
        update: jest.fn((id: string, patch: Partial<ScheduledTaskRun>) => {
            const existing = runs.get(id)
            if (existing === undefined) return Promise.reject(new Error(`run "${id}" not found`))
            const updated = { ...existing, ...patch }
            runs.set(id, updated)
            return Promise.resolve(updated)
        }),
        delete: jest.fn((id: string) => {
            runs.delete(id)
            return Promise.resolve()
        }),
        deleteByTaskId: jest.fn((taskId: string) => {
            for (const [id, run] of runs) {
                if (run.taskId === taskId) runs.delete(id)
            }
            return Promise.resolve()
        }),
        pruneOldest: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

function makeAgentDispatcher(events: Array<AgentEvent> = []): AgentDispatcherInterface {
    return {
        send: jest.fn(() =>
            (async function* () {
                for (const event of events) yield event
            })()
        ),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

function makeThrowingAgentDispatcher(error: Error): AgentDispatcherInterface {
    return {
        send: jest.fn(() => {
            throw error
        }),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

function makeWorkflow(id = 'workflow-1'): WorkFlowInterface {
    return {
        id,
        name: 'Test WorkFlow',
        validate: jest.fn(),
        getEntries: jest.fn(() => []),
        getConnections: jest.fn(() => []),
        findEntryById: jest.fn(() => null),
        findStartEntries: jest.fn(() => []),
        findFinalEntries: jest.fn(() => []),
        addNode: jest.fn(),
        removeNode: jest.fn(),
        addConnection: jest.fn(),
        removeConnection: jest.fn(),
        setPortMapping: jest.fn(),
        setConfigOverride: jest.fn()
    }
}

function makeWorkflowRunner(
    events: Array<WorkFlowEvent> = [],
    finalStatus?: typeof WORKFLOW_RUN_STATUS.FAILED | typeof WORKFLOW_RUN_STATUS.COMPLETED
): WorkFlowRunnerInterface {
    return {
        run: jest.fn((run: WorkFlowRunInterface) =>
            (async function* () {
                for (const event of events) yield event
                if (finalStatus !== undefined) run.setStatus(finalStatus)
            })()
        ),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

function makeChannel(overrides: Partial<ChannelInterface> = {}): ChannelInterface {
    return {
        id: 'web',
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        onMessage: jest.fn(),
        onStop: jest.fn(),
        configure: jest.fn(),
        settingsSchema: [],
        resolveSession: jest.fn(() => Promise.resolve(new Session('destination-session'))),
        send: jest.fn().mockResolvedValue(undefined),
        ...overrides
    }
}

function makeChannelRegistry(channels: Array<ChannelInterface> = []): ChannelRegistryInterface {
    const map = new Map(channels.map(c => [c.id, c]))
    return {
        get: jest.fn((id: string) => map.get(id) ?? null),
        has: jest.fn((id: string) => map.has(id)),
        register: jest.fn((id: string, channel: ChannelInterface) => {
            map.set(id, channel)
        }),
        unregister: jest.fn((id: string) => {
            map.delete(id)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

function makeSimpleRegistry<T>(items: Record<string, T> = {}) {
    return {
        get: jest.fn((id: string) => items[id] ?? null),
        has: jest.fn((id: string) => id in items),
        register: jest.fn(),
        unregister: jest.fn(),
        list: jest.fn(() => Object.values(items))
    }
}

function makeLoggerSpy(): LoggerInterface & { error: jest.Mock; warn: jest.Mock } {
    const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn()
    }
    logger.child.mockReturnValue(logger)
    return logger as unknown as LoggerInterface & { error: jest.Mock; warn: jest.Mock }
}

type SchedulerHarnessOptions = {
    tasks?: Array<ScheduledTask>
    runs?: Array<ScheduledTaskRun>
    agentDispatcher?: AgentDispatcherInterface
    workflowRunner?: WorkFlowRunnerInterface
    workflows?: Record<string, WorkFlowInterface>
    channels?: Array<ChannelInterface>
    sessions?: Array<SessionInterface>
    skills?: Array<Skill>
    logger?: LoggerInterface
}

function makeScheduler(options: SchedulerHarnessOptions = {}) {
    const taskRegistry = makeTaskRegistry(options.tasks ?? [])
    const taskRepository = makeTaskRepository()
    const runRepository = makeRunRepository(options.runs ?? [])
    const agentDispatcher = options.agentDispatcher ?? makeAgentDispatcher()
    const workflowRunner = options.workflowRunner ?? makeWorkflowRunner()
    const workflowRegistry = makeSimpleRegistry<WorkFlowInterface>(options.workflows ?? {}) as WorkFlowRegistryInterface
    const skillsByName = Object.fromEntries((options.skills ?? []).map(skill => [skill.name, skill]))
    const skillRegistry = makeSimpleRegistry<Skill>(skillsByName) as SkillRegistryInterface
    const channelRegistry = makeChannelRegistry(options.channels ?? [])
    const sessionManager = makeSessionManager(options.sessions ?? [])
    const sessionFactory = (id: string): SessionInterface => new Session(id)
    const logger = options.logger ?? new NoopLogger()

    const scheduler = new Scheduler(
        taskRegistry,
        taskRepository,
        runRepository,
        agentDispatcher,
        skillRegistry,
        workflowRegistry,
        workflowRunner,
        channelRegistry,
        sessionManager,
        sessionFactory,
        logger
    )

    return {
        scheduler,
        taskRegistry,
        taskRepository,
        runRepository,
        agentDispatcher,
        workflowRunner,
        sessionManager,
        skillRegistry
    }
}

function messageEvent(text: string): AgentEvent {
    return {
        id: randomUUID(),
        agentId: 'agent-1',
        sessionId: 'exec-session',
        createdAt: Date.now(),
        type: AGENT_EVENT_TYPE.MESSAGE,
        message: text
    }
}

function errorEvent(text: string): AgentEvent {
    return {
        id: randomUUID(),
        agentId: 'agent-1',
        sessionId: 'exec-session',
        createdAt: Date.now(),
        type: AGENT_EVENT_TYPE.ERROR,
        error: text,
        recoverable: false
    }
}

function structuredOutputEvent(output: unknown): AgentEvent {
    return {
        id: randomUUID(),
        agentId: 'agent-1',
        sessionId: 'exec-session',
        createdAt: Date.now(),
        type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT,
        output
    }
}

async function settle(): Promise<void> {
    await jest.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
    jest.useFakeTimers()
})

afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
})

describe('Scheduler', () => {
    describe('tick / rescheduling', () => {
        it('does not fire a disabled task', async () => {
            const task = makeTask({ enabled: false, nextFireAt: Date.now() - 1000 })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(agentDispatcher.send).not.toHaveBeenCalled()
        })

        it('does not fire a task whose nextFireAt is in the future', async () => {
            const task = makeTask({ nextFireAt: Date.now() + 60_000 })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(agentDispatcher.send).not.toHaveBeenCalled()
        })

        it('fires a due task and unregisters a "once" task afterwards', async () => {
            const task = makeTask({
                schedule: { type: SCHEDULE_SPEC_TYPE.ONCE, at: Date.now() },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, agentDispatcher, taskRegistry, taskRepository } = makeScheduler({ tasks: [task] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)
            expect(taskRegistry.unregister).toHaveBeenCalledWith('task-1')
            expect(taskRepository.delete).toHaveBeenCalledWith('task-1')
        })

        it('fires a due cron task and recomputes nextFireAt instead of deleting it', async () => {
            const task = makeTask({
                schedule: { type: SCHEDULE_SPEC_TYPE.CRON, expression: '*/30 * * * * *' },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, agentDispatcher, taskRegistry, taskRepository } = makeScheduler({ tasks: [task] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)
            expect(taskRegistry.unregister).not.toHaveBeenCalled()
            expect(taskRepository.delete).not.toHaveBeenCalled()
            expect(taskRepository.update).toHaveBeenCalledWith('task-1', { nextFireAt: expect.any(Number) })
        })

        it('does not let a task with a broken schedule block other due tasks in the same tick', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {})

            const brokenTask = makeTask({
                id: 'broken',
                schedule: { type: SCHEDULE_SPEC_TYPE.CRON, expression: 'not a cron expression' },
                nextFireAt: Date.now() - 1000
            })
            const healthyTask = makeTask({
                id: 'healthy',
                schedule: { type: SCHEDULE_SPEC_TYPE.ONCE, at: Date.now() },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [brokenTask, healthyTask] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(agentDispatcher.send).toHaveBeenCalledTimes(2)
        })

        it('logs and continues when firing a due task rejects before its own error handling begins', async () => {
            const logger = makeLoggerSpy()
            const task = makeTask({ nextFireAt: Date.now() - 1000 })
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], logger })
            ;(runRepository.create as jest.Mock).mockRejectedValueOnce(new Error('disk full'))

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('task-1'),
                expect.objectContaining({ taskId: 'task-1', error: 'disk full' })
            )
        })

        it('does not throw when persisting the deletion of a fired "once" task rejects', async () => {
            const task = makeTask({
                schedule: { type: SCHEDULE_SPEC_TYPE.ONCE, at: Date.now() },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, taskRepository, taskRegistry } = makeScheduler({ tasks: [task] })
            ;(taskRepository.delete as jest.Mock).mockRejectedValueOnce(new Error('disk full'))

            await scheduler.start()
            await expect(jest.advanceTimersByTimeAsync(1000)).resolves.toBeUndefined()

            expect(taskRegistry.unregister).toHaveBeenCalledWith('task-1')
        })

        it('does not throw when persisting the reschedule of a fired cron task rejects', async () => {
            const task = makeTask({
                schedule: { type: SCHEDULE_SPEC_TYPE.CRON, expression: '*/30 * * * * *' },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, taskRepository, taskRegistry } = makeScheduler({ tasks: [task] })
            ;(taskRepository.update as jest.Mock).mockRejectedValueOnce(new Error('disk full'))

            await scheduler.start()
            await expect(jest.advanceTimersByTimeAsync(1000)).resolves.toBeUndefined()

            expect(taskRegistry.register).toHaveBeenCalledWith('task-1', expect.objectContaining({ id: 'task-1' }))
        })
    })

    describe('stop()', () => {
        it('stops firing due tasks after being stopped', async () => {
            const task = makeTask({
                schedule: { type: SCHEDULE_SPEC_TYPE.CRON, expression: '*/1 * * * * *' },
                nextFireAt: Date.now() - 1000
            })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task] })

            await scheduler.start()
            await jest.advanceTimersByTimeAsync(1000)
            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)

            scheduler.stop()
            await jest.advanceTimersByTimeAsync(5000)

            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)
        })

        it('does not throw when called before start() or when called twice', () => {
            const { scheduler } = makeScheduler()
            expect(() => {
                scheduler.stop()
            }).not.toThrow()
            expect(() => {
                scheduler.stop()
            }).not.toThrow()
        })
    })

    describe('runNow', () => {
        it('returns a runId immediately and completes the run in the background', async () => {
            const task = makeTask({ nextFireAt: Date.now() + 60_000 })
            const { scheduler, agentDispatcher, runRepository } = makeScheduler({
                tasks: [task],
                agentDispatcher: makeAgentDispatcher([messageEvent('hello')])
            })

            const runId = await scheduler.runNow('task-1')
            expect(typeof runId).toBe('string')
            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)

            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })

        it('throws for an unknown task id', async () => {
            const { scheduler } = makeScheduler()
            await expect(scheduler.runNow('missing')).rejects.toThrow()
        })

        it('fires even when the task is disabled or not yet due', async () => {
            const task = makeTask({ enabled: false, nextFireAt: Date.now() + 60_000 })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task] })

            await scheduler.runNow('task-1')
            expect(agentDispatcher.send).toHaveBeenCalledTimes(1)
        })
    })

    describe('prompt task outcomes', () => {
        it('delivers a message and completes when the agent responds', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                agentDispatcher: makeAgentDispatcher([structuredOutputEvent({ action: 'respond', message: 'done!' })])
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.send).toHaveBeenCalledWith(
                { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE, text: 'done!' },
                expect.anything(),
                expect.anything()
            )

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
            expect(run?.outcome).toEqual({ type: SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE, text: 'done!' })
        })

        it('does not touch the destination session when the agent decides to skip', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const { scheduler, runRepository, sessionManager } = makeScheduler({
                tasks: [task],
                channels: [channel],
                agentDispatcher: makeAgentDispatcher([structuredOutputEvent({ action: 'skip' })])
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.send).toHaveBeenCalledWith(
                { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP },
                expect.anything(),
                expect.anything()
            )
            expect(sessionManager.save).not.toHaveBeenCalled()

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
            expect(run?.outcome).toEqual({ type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP })
        })

        it('never requests structured output for a silent destination', async () => {
            const task = makeTask({ destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.SILENT } })
            const agentDispatcher = makeAgentDispatcher([messageEvent('irrelevant')])
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(agentDispatcher.send).toHaveBeenCalledWith(
                'agent-1',
                expect.anything(),
                'do the thing',
                expect.not.objectContaining({ outputSchema: expect.anything() })
            )

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })

        it('ignores delta-type events from the agent stream', async () => {
            const task = makeTask()
            const deltaEvent: AgentEvent = {
                id: randomUUID(),
                agentId: 'agent-1',
                sessionId: 'exec-session',
                createdAt: Date.now(),
                type: AGENT_EVENT_TYPE.MESSAGE_DELTA,
                delta: 'partial'
            }
            const agentDispatcher = makeAgentDispatcher([deltaEvent, messageEvent('final')])
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.events).toHaveLength(1)
            expect(run?.events[0]?.type).toBe(AGENT_EVENT_TYPE.MESSAGE)
        })

        it('resolves a TELEGRAM destination using chatId', async () => {
            const task = makeTask({ destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.TELEGRAM, chatId: 42 } })
            const channel = makeChannel({ id: 'telegram' })
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                agentDispatcher: makeAgentDispatcher([structuredOutputEvent({ action: 'respond', message: 'hi' })])
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.resolveSession).toHaveBeenCalledWith({ chatId: 42 })
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })

        it('fails without dispatching to the agent when no channel is registered for the destination', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const { scheduler, agentDispatcher, runRepository } = makeScheduler({ tasks: [task] })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(agentDispatcher.send).not.toHaveBeenCalled()
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
        })

        it('reuses an existing session for a persistent-session task', async () => {
            const task = makeTask({
                execution: {
                    type: SCHEDULED_TASK_EXECUTION_TYPE.PROMPT,
                    agentId: 'agent-1',
                    prompt: 'do the thing',
                    sessionMode: SCHEDULED_TASK_SESSION_MODE.PERSISTENT
                }
            })
            const existingSession = new Session('scheduler-task-1')
            const { scheduler, agentDispatcher, sessionManager } = makeScheduler({
                tasks: [task],
                sessions: [existingSession]
            })

            await scheduler.runNow('task-1')
            await settle()

            expect(sessionManager.create).not.toHaveBeenCalled()
            expect(agentDispatcher.send).toHaveBeenCalledWith(
                'agent-1',
                existingSession,
                'do the thing',
                expect.anything()
            )
        })

        it('uses FAIL guardrail mode when the task specifies it', async () => {
            const task = makeTask({
                execution: {
                    type: SCHEDULED_TASK_EXECUTION_TYPE.PROMPT,
                    agentId: 'agent-1',
                    prompt: 'do the thing',
                    sessionMode: SCHEDULED_TASK_SESSION_MODE.EPHEMERAL,
                    guardrailPolicy: SCHEDULED_TASK_GUARDRAIL_POLICY.FAIL
                }
            })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task] })

            await scheduler.runNow('task-1')
            await settle()

            expect(agentDispatcher.send).toHaveBeenCalledWith(
                'agent-1',
                expect.anything(),
                'do the thing',
                expect.objectContaining({
                    guardrailPolicy: {
                        input: GUARDRAIL_CHECK_MODE.FAIL,
                        output: GUARDRAIL_CHECK_MODE.FAIL,
                        toolCall: GUARDRAIL_CHECK_MODE.FAIL
                    }
                })
            )
        })

        it('saves the destination session without calling send when the channel does not implement it', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const { send: _send, ...channelWithoutSend } = makeChannel({ id: 'web' })
            const channel = channelWithoutSend as ChannelInterface
            const { scheduler, runRepository, sessionManager } = makeScheduler({
                tasks: [task],
                channels: [channel],
                agentDispatcher: makeAgentDispatcher([structuredOutputEvent({ action: 'respond', message: 'hi' })])
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(sessionManager.save).toHaveBeenCalled()
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })

        it('fails without dispatching to the agent when the destination cannot be resolved', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'ghost' }
            })
            const channel = makeChannel({ id: 'web', resolveSession: jest.fn().mockResolvedValue(null) })
            const { scheduler, agentDispatcher, runRepository } = makeScheduler({ tasks: [task], channels: [channel] })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(agentDispatcher.send).not.toHaveBeenCalled()

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
        })

        it('treats a concurrent persistent-session run as a skip, not a failure', async () => {
            const task = makeTask({
                execution: {
                    type: SCHEDULED_TASK_EXECUTION_TYPE.PROMPT,
                    agentId: 'agent-1',
                    prompt: 'do the thing',
                    sessionMode: SCHEDULED_TASK_SESSION_MODE.PERSISTENT
                }
            })
            const agentDispatcher = makeThrowingAgentDispatcher(new AgentSessionError())
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.SKIPPED)
        })

        it('marks the run as failed and delivers the error for any other agent error', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const agentDispatcher = makeThrowingAgentDispatcher(new Error('provider exploded'))
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], channels: [channel], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.send).toHaveBeenCalledWith(
                { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: 'provider exploded' },
                expect.anything(),
                expect.anything()
            )

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
        })

        it('records an ERROR event mid-stream as the outcome', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const agentDispatcher = makeAgentDispatcher([errorEvent('agent misbehaved'), messageEvent('ignored')])
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], channels: [channel], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.outcome).toEqual({ type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: 'agent misbehaved' })
        })

        it('marks the outcome as an error when the agent returns an invalid structured outcome', async () => {
            const task = makeTask({
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const agentDispatcher = makeAgentDispatcher([structuredOutputEvent({ action: 'not-a-real-action' })])
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], channels: [channel], agentDispatcher })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.outcome).toEqual({
                type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR,
                text: 'Agent returned an invalid structured outcome'
            })
        })

        it('logs and continues when completing the run rejects after execution finishes', async () => {
            const logger = makeLoggerSpy()
            const task = makeTask()
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], logger })
            ;(runRepository.update as jest.Mock).mockRejectedValueOnce(new Error('write failed'))

            await scheduler.runNow('task-1')
            await settle()

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('task-1'),
                expect.objectContaining({ taskId: 'task-1', error: 'write failed' })
            )
        })

        it('forces a tool call for each skill that exists in the registry, skipping the rest', async () => {
            const existingSkill = makeSkillMock({ name: 'existing-skill' })
            const task = makeTask({
                execution: {
                    type: SCHEDULED_TASK_EXECUTION_TYPE.PROMPT,
                    agentId: 'agent-1',
                    prompt: 'do the thing',
                    sessionMode: SCHEDULED_TASK_SESSION_MODE.EPHEMERAL,
                    skills: ['existing-skill', 'missing-skill']
                }
            })
            const { scheduler, agentDispatcher } = makeScheduler({ tasks: [task], skills: [existingSkill] })

            await scheduler.runNow('task-1')
            await settle()

            const call = (agentDispatcher.send as jest.Mock).mock.calls[0] as [
                string,
                unknown,
                string,
                { forcedToolCalls?: Array<{ tool: { name: string } }> }
            ]
            const forcedToolCalls = call[3].forcedToolCalls
            expect(forcedToolCalls).toHaveLength(1)
            expect(forcedToolCalls?.[0]?.tool.name).toBe('skill__existing-skill')
        })
    })

    describe('workflow task outcomes', () => {
        it('delivers the workflow output as a message on success', async () => {
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} },
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const workflowRunner = makeWorkflowRunner([], WORKFLOW_RUN_STATUS.COMPLETED)
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                workflows: { 'workflow-1': workflow },
                workflowRunner
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.send).toHaveBeenCalledTimes(1)
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })

        it('marks the run failed and delivers the error when the workflow run fails', async () => {
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} },
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const startedEvent: WorkFlowEvent = {
                id: randomUUID(),
                runId: 'run-1',
                createdAt: Date.now(),
                type: WORKFLOW_EVENT_TYPE.RUN_STARTED
            }
            const failedEvent: WorkFlowEvent = {
                id: randomUUID(),
                runId: 'run-1',
                createdAt: Date.now(),
                type: WORKFLOW_EVENT_TYPE.RUN_FAILED,
                error: 'node exploded'
            }
            const workflowRunner = makeWorkflowRunner([startedEvent, failedEvent], WORKFLOW_RUN_STATUS.FAILED)
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                workflows: { 'workflow-1': workflow },
                workflowRunner
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(channel.send).toHaveBeenCalledWith(
                { type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: 'node exploded' },
                expect.anything(),
                expect.anything()
            )
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
        })

        it('falls back to a generic message when the workflow fails without a RUN_FAILED event', async () => {
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} },
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'dest-1' }
            })
            const channel = makeChannel({ id: 'web' })
            const workflowRunner = makeWorkflowRunner([], WORKFLOW_RUN_STATUS.FAILED)
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                workflows: { 'workflow-1': workflow },
                workflowRunner
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.outcome).toEqual({ type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR, text: 'WorkFlow run failed' })
        })

        it('does not deliver or produce a message outcome for a silent destination on success', async () => {
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} },
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.SILENT }
            })
            const workflowRunner = makeWorkflowRunner([], WORKFLOW_RUN_STATUS.COMPLETED)
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                workflows: { 'workflow-1': workflow },
                workflowRunner
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
            expect(run?.outcome).toEqual({ type: SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP })
        })

        it('fails without invoking the runner when the workflow does not exist', async () => {
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'missing', input: {} }
            })
            const workflowRunner = makeWorkflowRunner()
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], workflowRunner })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(workflowRunner.run).not.toHaveBeenCalled()
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
        })

        it('fails without invoking the runner when the destination cannot be resolved', async () => {
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} },
                destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.WEB, sessionId: 'ghost' }
            })
            const channel = makeChannel({ id: 'web', resolveSession: jest.fn().mockResolvedValue(null) })
            const workflowRunner = makeWorkflowRunner()
            const { scheduler, runRepository } = makeScheduler({
                tasks: [task],
                channels: [channel],
                workflows: { 'workflow-1': workflow },
                workflowRunner
            })

            const runId = await scheduler.runNow('task-1')
            await settle()

            expect(workflowRunner.run).not.toHaveBeenCalled()
            const run = await runRepository.findById(runId)
            expect(run?.status).toBe(SCHEDULED_TASK_RUN_STATUS.FAILED)
            expect(run?.outcome).toEqual({
                type: SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR,
                text: 'Destination session could not be resolved'
            })
        })

        it('logs and continues when the workflow runner rejects outright', async () => {
            const logger = makeLoggerSpy()
            const workflow = makeWorkflow('workflow-1')
            const task = makeTask({
                execution: { type: SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW, workflowId: 'workflow-1', input: {} }
            })
            const workflowRunner: WorkFlowRunnerInterface = {
                run: jest.fn(() => {
                    throw new Error('runner exploded')
                }),
                stop: jest.fn().mockResolvedValue(undefined)
            }
            const { scheduler } = makeScheduler({
                tasks: [task],
                workflows: { 'workflow-1': workflow },
                workflowRunner,
                logger
            })

            await scheduler.runNow('task-1')
            await settle()

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('task-1'),
                expect.objectContaining({ taskId: 'task-1', error: 'runner exploded' })
            )
        })
    })

    describe('run history retention', () => {
        it('prunes old runs for the task after completing a run', async () => {
            const task = makeTask()
            const { scheduler, runRepository } = makeScheduler({ tasks: [task] })

            await scheduler.runNow('task-1')
            await settle()

            expect(runRepository.pruneOldest).toHaveBeenCalledWith('task-1', MAX_RUNS_PER_TASK)
        })

        it('logs and continues when pruning old runs rejects', async () => {
            const logger = makeLoggerSpy()
            const task = makeTask()
            const { scheduler, runRepository } = makeScheduler({ tasks: [task], logger })
            ;(runRepository.pruneOldest as jest.Mock).mockRejectedValueOnce(new Error('prune failed'))

            await scheduler.runNow('task-1')
            await settle()

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('task-1'),
                expect.objectContaining({ taskId: 'task-1', error: 'prune failed' })
            )
        })
    })

    describe('crash recovery', () => {
        it('marks orphaned running runs as interrupted on start', async () => {
            const orphanedRun = makeRun({
                id: 'run-orphan',
                status: SCHEDULED_TASK_RUN_STATUS.RUNNING,
                startedAt: Date.now() - 10_000
            })
            const completedRun = makeRun({
                id: 'run-done',
                status: SCHEDULED_TASK_RUN_STATUS.COMPLETED,
                startedAt: Date.now() - 20_000,
                completedAt: Date.now() - 19_000
            })
            const { scheduler, runRepository } = makeScheduler({ runs: [orphanedRun, completedRun] })

            await scheduler.start()

            const orphan = await runRepository.findById('run-orphan')
            const completed = await runRepository.findById('run-done')

            expect(orphan?.status).toBe(SCHEDULED_TASK_RUN_STATUS.INTERRUPTED)
            expect(completed?.status).toBe(SCHEDULED_TASK_RUN_STATUS.COMPLETED)
        })
    })
})
