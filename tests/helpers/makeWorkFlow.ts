import {
    WorkFlowInterface,
    WorkFlowRegistryInterface,
    WorkFlowRepositoryInterface,
    WorkFlowRunInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRunnerInterface,
    WorkFlowNodeRegistryInterface,
    WorkFlowRunStatus,
    WORKFLOW_RUN_STATUS,
    WorkFlowEvent,
    WorkFlow,
    WorkFlowRun,
    WorkFlowNodeRegistry,
    InputNode
} from '@workflow'

export function makeWorkFlow(id = 'wf-1', name = 'My Workflow'): WorkFlow {
    const wf = new WorkFlow(id, name)
    wf.addNode('start', new InputNode())
    return wf
}

export function makeWorkFlowRun(
    workflowId = 'wf-1',
    status: WorkFlowRunStatus = WORKFLOW_RUN_STATUS.PENDING
): WorkFlowRun {
    const wf = makeWorkFlow(workflowId)
    const run = new WorkFlowRun(null, wf)
    if (status !== WORKFLOW_RUN_STATUS.PENDING) run.setStatus(status)
    return run
}

export function makeWorkFlowRegistry(workflows: Array<WorkFlowInterface> = []): WorkFlowRegistryInterface {
    const map = new Map(workflows.map(w => [w.id, w]))
    return {
        get: jest.fn((id: string) => map.get(id) ?? null),
        has: jest.fn((id: string) => map.has(id)),
        register: jest.fn((id: string, wf: WorkFlowInterface) => {
            map.set(id, wf)
        }),
        unregister: jest.fn((id: string) => {
            map.delete(id)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeWorkFlowRepository(): WorkFlowRepositoryInterface {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((wf: WorkFlowInterface) => Promise.resolve(wf)),
        update: jest.fn().mockImplementation((_id: string, wf: WorkFlowInterface) => Promise.resolve(wf)),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeWorkFlowRunRepository(runs: Array<WorkFlowRunInterface> = []): WorkFlowRunRepositoryInterface {
    const map = new Map(runs.map(r => [r.id, r]))
    return {
        findAll: jest.fn(() => Promise.resolve([...map.values()])),
        findById: jest.fn((id: string) => Promise.resolve(map.get(id) ?? null)),
        create: jest.fn().mockImplementation((r: WorkFlowRunInterface) => {
            map.set(r.id, r)
            return Promise.resolve(r)
        }),
        update: jest.fn().mockImplementation((_id: string, r: WorkFlowRunInterface) => Promise.resolve(r)),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeWorkFlowRunner(events: Array<WorkFlowEvent> = []): WorkFlowRunnerInterface {
    return {
        run: jest.fn().mockReturnValue(
            (async function* () {
                for (const event of events) yield event
            })()
        ),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeThrowingWorkFlowRunner(error: Error): WorkFlowRunnerInterface {
    return {
        run: jest.fn().mockReturnValue(
            (async function* () {
                throw error
            })()
        ),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeWorkFlowNodeRegistry(): WorkFlowNodeRegistryInterface {
    const registry = new WorkFlowNodeRegistry()
    registry.register('input', new InputNode())
    return registry
}
