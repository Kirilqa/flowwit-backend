import {
    WorkFlow,
    WorkFlowRun,
    WorkFlowRunner,
    InputNode,
    TransformNode,
    WORKFLOW_RUN_STATUS,
    WORKFLOW_NODE_STATE_STATUS
} from '@workflow'
import { InMemoryWorkFlowRunRepository } from '@workflow/repositories/InMemoryWorkFlowRunRepository'
import { collectEvents } from '../../../helpers/collectEvents'

function buildSimpleWorkflow(): WorkFlow {
    const workflow = new WorkFlow('wf-repo', 'Repository Test')
    workflow.addNode('input', new InputNode())
    workflow.addNode('transform', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'transform',
        targetPort: 'value'
    })
    workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })
    return workflow
}

function buildFailingWorkflow(): WorkFlow {
    const workflow = new WorkFlow('wf-fail', 'Failing Test')
    workflow.addNode('input', new InputNode())
    workflow.addNode('transform', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'transform',
        targetPort: 'value'
    })
    workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '(((' })
    return workflow
}

describe('WorkFlowRunner + InMemoryWorkFlowRunRepository (integration)', () => {
    let repository: InMemoryWorkFlowRunRepository
    let runner: WorkFlowRunner

    beforeEach(() => {
        repository = new InMemoryWorkFlowRunRepository()
        runner = new WorkFlowRunner(repository)
    })

    it('run status is COMPLETED after successful run', async () => {
        const run = new WorkFlowRun('hello', buildSimpleWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
    })

    it('run is accessible from repository after completion', async () => {
        const run = new WorkFlowRun('hello', buildSimpleWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        expect(await repository.findById(run.id)).not.toBeNull()
    })

    it('run output is correct after successful execution', async () => {
        const run = new WorkFlowRun('hello', buildSimpleWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        expect(run.getOutput()).toMatchObject({ transform: { result: 'hello' } })
    })

    it('all node executions reach COMPLETED status', async () => {
        const run = new WorkFlowRun('hello', buildSimpleWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        for (const entry of run.getEntries()) {
            const statuses = Object.values(entry.executions).map(ex => ex.status)
            expect(statuses).toContain(WORKFLOW_NODE_STATE_STATUS.COMPLETED)
        }
    })

    it('run status is FAILED when a node throws', async () => {
        const run = new WorkFlowRun('hello', buildFailingWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        expect(run.status).toBe(WORKFLOW_RUN_STATUS.FAILED)
    })

    it('failed node execution carries an error message', async () => {
        const run = new WorkFlowRun('hello', buildFailingWorkflow())
        await repository.create(run)
        await collectEvents(runner.run(run))

        const transformEntry = run.getEntries().find(e => e.id === 'transform')
        const executions = Object.values(transformEntry?.executions ?? {})
        expect(executions.some(ex => ex.error !== undefined)).toBe(true)
    })

    it('two runs on independent workflows are tracked separately', async () => {
        const run1 = new WorkFlowRun('first', buildSimpleWorkflow())
        const run2 = new WorkFlowRun('second', buildSimpleWorkflow())

        await repository.create(run1)
        await repository.create(run2)
        await collectEvents(runner.run(run1))
        await collectEvents(runner.run(run2))

        const all = await repository.findAll()
        expect(all).toHaveLength(2)
        expect(run1.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        expect(run2.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
    })
})
