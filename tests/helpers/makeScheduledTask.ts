import {
    ScheduledTask,
    SCHEDULE_SPEC_TYPE,
    SCHEDULED_TASK_DESTINATION_TYPE,
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_SESSION_MODE,
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface
} from '@scheduler'

export function makeScheduledTask(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
    return {
        id: 'task-1',
        schedule: { type: SCHEDULE_SPEC_TYPE.ONCE, at: Date.now() },
        execution: {
            type: SCHEDULED_TASK_EXECUTION_TYPE.PROMPT,
            agentId: 'agent-1',
            prompt: 'do the thing',
            sessionMode: SCHEDULED_TASK_SESSION_MODE.EPHEMERAL
        },
        destination: { type: SCHEDULED_TASK_DESTINATION_TYPE.SILENT },
        nextFireAt: Date.now(),
        enabled: true,
        ...overrides
    }
}

export function makeTaskRegistry(tasks: Array<ScheduledTask> = []): ScheduledTaskRegistryInterface {
    const map = new Map(tasks.map(t => [t.id, t]))
    return {
        get: jest.fn((id: string) => map.get(id) ?? null),
        has: jest.fn((id: string) => map.has(id)),
        register: jest.fn((id: string, task: ScheduledTask) => {
            map.set(id, task)
        }),
        unregister: jest.fn((id: string) => {
            map.delete(id)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeTaskRepository(tasks: Array<ScheduledTask> = []): ScheduledTaskRepositoryInterface {
    return {
        findAll: jest.fn().mockResolvedValue(tasks),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((task: ScheduledTask) => Promise.resolve(task)),
        update: jest.fn().mockImplementation((_id: string, patch: Partial<ScheduledTask>) => Promise.resolve(patch)),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}
