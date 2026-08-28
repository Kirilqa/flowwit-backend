import {
    WorkFlow,
    WorkFlowRun,
    WorkFlowRunner,
    InputNode,
    TransformNode,
    ConditionNode,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS
} from '@workflow'
import { collectEvents } from '../../../helpers/collectEvents'

function buildThreeNodePipeline(): WorkFlow {
    const workflow = new WorkFlow('wf-e2e-pipeline', 'E2E Three-Node Pipeline')
    workflow.addNode('input', new InputNode())
    workflow.addNode('upper', new TransformNode())
    workflow.addNode('exclaim', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'upper',
        targetPort: 'value'
    })
    workflow.addConnection({
        id: 'c2',
        sourceNodeId: 'upper',
        sourcePort: 'result',
        targetNodeId: 'exclaim',
        targetPort: 'value'
    })
    workflow.setConfigOverride('upper', 'expression', { type: 'constant', data: '$input.toUpperCase()' })
    workflow.setConfigOverride('exclaim', 'expression', { type: 'constant', data: '$input + "!"' })
    return workflow
}

function buildConditionalPipeline(): WorkFlow {
    const workflow = new WorkFlow('wf-e2e-condition', 'E2E Conditional Pipeline')
    workflow.addNode('input', new InputNode())
    workflow.addNode('upper', new TransformNode())
    workflow.addNode('check', new ConditionNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'upper',
        targetPort: 'value'
    })
    workflow.addConnection({
        id: 'c2',
        sourceNodeId: 'upper',
        sourcePort: 'result',
        targetNodeId: 'check',
        targetPort: 'value'
    })
    workflow.setConfigOverride('upper', 'expression', { type: 'constant', data: '$input.toUpperCase()' })
    workflow.setConfigOverride('check', 'condition', { type: 'expression', expression: '$ports.value.length > 3' })
    return workflow
}

describe('Multi-step WorkFlow (e2e)', () => {
    const runner = new WorkFlowRunner()

    describe('three-node linear pipeline', () => {
        it('completes all events in correct order', async () => {
            const run = new WorkFlowRun('hello', buildThreeNodePipeline())
            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types[0]).toBe(WORKFLOW_EVENT_TYPE.RUN_STARTED)
            expect(types[types.length - 1]).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        })

        it('transforms input through both nodes in sequence', async () => {
            const run = new WorkFlowRun('hello', buildThreeNodePipeline())

            await collectEvents(runner.run(run))

            expect(run.getOutput()).toMatchObject({ exclaim: { result: 'HELLO!' } })
        })

        it('correctly processes different inputs', async () => {
            const run = new WorkFlowRun('world', buildThreeNodePipeline())

            await collectEvents(runner.run(run))

            expect(run.getOutput()).toMatchObject({ exclaim: { result: 'WORLD!' } })
        })

        it('emits NODE_STARTED and NODE_COMPLETED for each node', async () => {
            const run = new WorkFlowRun('hi', buildThreeNodePipeline())
            const events = await collectEvents(runner.run(run))

            const nodeStarted = events.filter(e => e.type === WORKFLOW_EVENT_TYPE.NODE_STARTED)
            const nodeCompleted = events.filter(e => e.type === WORKFLOW_EVENT_TYPE.NODE_COMPLETED)

            expect(nodeStarted).toHaveLength(3)
            expect(nodeCompleted).toHaveLength(3)
        })
    })

    describe('conditional branch pipeline', () => {
        it('routes to true branch for input longer than 3 characters', async () => {
            const run = new WorkFlowRun('hello', buildConditionalPipeline())

            await collectEvents(runner.run(run))

            expect(run.getOutput()).toMatchObject({ check: { true: 'HELLO' } })
            expect(run.getOutput()).not.toMatchObject({ check: { false: expect.anything() } })
        })

        it('routes to false branch for input of 3 characters or fewer', async () => {
            const run = new WorkFlowRun('hi', buildConditionalPipeline())

            await collectEvents(runner.run(run))

            expect(run.getOutput()).toMatchObject({ check: { false: 'HI' } })
            expect(run.getOutput()).not.toMatchObject({ check: { true: expect.anything() } })
        })

        it('completes successfully for both branch outcomes', async () => {
            const runLong = new WorkFlowRun('hello', buildConditionalPipeline())
            const runShort = new WorkFlowRun('hi', buildConditionalPipeline())

            const [eventsLong, eventsShort] = await Promise.all([
                collectEvents(runner.run(runLong)),
                collectEvents(runner.run(runShort))
            ])

            expect(eventsLong[eventsLong.length - 1]?.type).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
            expect(eventsShort[eventsShort.length - 1]?.type).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
        })
    })
})
