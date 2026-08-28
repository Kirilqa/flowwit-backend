import { z } from 'zod'
import {
    WorkFlow,
    WorkFlowRun,
    InputNode,
    TransformNode,
    ForLoopNode,
    MergeNode,
    DelayNode,
    BaseWorkFlowNode,
    WorkFlowNodeEvent,
    WorkFlowNodeResult,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS,
    WorkFlowEvent
} from '@workflow'
import { WorkFlowRunner } from '@workflow/implementations/runner/WorkFlowRunner'
import { collectEvents } from '../../../../../helpers/collectEvents'

const yieldingPortsSchema = z.object({ value: z.unknown() })
const yieldingOutputsSchema = z.object({ result: z.unknown() })

class YieldingNode extends BaseWorkFlowNode<typeof yieldingPortsSchema, typeof yieldingOutputsSchema> {
    readonly type = 'yielding' as const
    readonly ports = yieldingPortsSchema
    readonly outputs = yieldingOutputsSchema

    protected async *run(
        ports: z.infer<typeof yieldingPortsSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof yieldingOutputsSchema>>> {
        yield { type: WORKFLOW_EVENT_TYPE.NODE_EVENT, payload: { progress: 'halfway' }, createdAt: Date.now() }
        return { output: { result: ports.value } }
    }
}

function buildWorkflow(): WorkFlow {
    return new WorkFlow('wf-test', 'Test Workflow')
}

function buildTwoNodeWorkflow(): WorkFlow {
    const workflow = buildWorkflow()
    workflow.addNode('input', new InputNode())
    workflow.addNode('transform', new TransformNode())
    workflow.addConnection({
        id: 'conn-1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'transform',
        targetPort: 'value'
    })
    workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })
    return workflow
}

function buildFailingWorkflow(): WorkFlow {
    const workflow = buildWorkflow()
    workflow.addNode('input', new InputNode())
    workflow.addNode('transform', new TransformNode())
    workflow.addConnection({
        id: 'conn-1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'transform',
        targetPort: 'value'
    })
    workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '(((' })
    return workflow
}

describe('WorkFlowRunner', () => {
    let runner: WorkFlowRunner

    beforeEach(() => {
        runner = new WorkFlowRunner()
    })

    describe('run()', () => {
        it('first event is RUN_STARTED and last is RUN_COMPLETED', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('hello', workflow)

            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types[0]).toBe(WORKFLOW_EVENT_TYPE.RUN_STARTED)
            expect(types[types.length - 1]).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
        })

        it('emits NODE_STARTED before NODE_COMPLETED for each node', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('hello', workflow)

            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types).toContain(WORKFLOW_EVENT_TYPE.NODE_STARTED)
            expect(types).toContain(WORKFLOW_EVENT_TYPE.NODE_COMPLETED)
            expect(types.indexOf(WORKFLOW_EVENT_TYPE.NODE_STARTED)).toBeLessThan(
                types.indexOf(WORKFLOW_EVENT_TYPE.NODE_COMPLETED)
            )
        })

        it('node events carry the correct nodeId', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('hello', workflow)

            const events = await collectEvents(runner.run(run))

            expect(events).toContainEqual(
                expect.objectContaining({ type: WORKFLOW_EVENT_TYPE.NODE_STARTED, nodeId: 'input' })
            )
            expect(events).toContainEqual(
                expect.objectContaining({ type: WORKFLOW_EVENT_TYPE.NODE_COMPLETED, nodeId: 'input' })
            )
        })

        it('sets run status to completed after successful execution', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('hello', workflow)

            await collectEvents(runner.run(run))

            expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        })

        it('captures input node output in run getOutput()', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('test-value', workflow)

            await collectEvents(runner.run(run))

            expect(run.getOutput()['input']).toEqual({ result: 'test-value' })
        })

        it('propagates value through a two-node chain to final output', async () => {
            const run = new WorkFlowRun('hello', buildTwoNodeWorkflow())

            await collectEvents(runner.run(run))

            expect(run.getOutput()['transform']).toEqual({ result: 'hello' })
        })

        it('executes both nodes in a two-node chain', async () => {
            const run = new WorkFlowRun('hello', buildTwoNodeWorkflow())

            const events = await collectEvents(runner.run(run))
            const nodeStarted = events.filter(e => e.type === WORKFLOW_EVENT_TYPE.NODE_STARTED)

            expect(nodeStarted).toHaveLength(2)
        })

        it('runs multiple independent runs without interference', async () => {
            const workflowA = buildWorkflow()
            workflowA.addNode('input', new InputNode())
            const workflowB = buildWorkflow()
            workflowB.addNode('input', new InputNode())

            const runA = new WorkFlowRun('value-a', workflowA)
            const runB = new WorkFlowRun('value-b', workflowB)

            await Promise.all([collectEvents(runner.run(runA)), collectEvents(runner.run(runB))])

            expect(runA.getOutput()['input']).toEqual({ result: 'value-a' })
            expect(runB.getOutput()['input']).toEqual({ result: 'value-b' })
        })

        it('yields NODE_FAILED when a node throws', async () => {
            const run = new WorkFlowRun('hello', buildFailingWorkflow())

            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types).toContain(WORKFLOW_EVENT_TYPE.NODE_FAILED)
        })

        it('last event is RUN_FAILED when a node throws', async () => {
            const run = new WorkFlowRun('hello', buildFailingWorkflow())

            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types[types.length - 1]).toBe(WORKFLOW_EVENT_TYPE.RUN_FAILED)
        })

        it('sets run status to failed when a node throws', async () => {
            const run = new WorkFlowRun('hello', buildFailingWorkflow())

            await collectEvents(runner.run(run))

            expect(run.status).toBe(WORKFLOW_RUN_STATUS.FAILED)
        })

        it('does not emit RUN_COMPLETED when a node fails', async () => {
            const run = new WorkFlowRun('hello', buildFailingWorkflow())

            const events = await collectEvents(runner.run(run))
            const types = events.map(e => e.type)

            expect(types).not.toContain(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
        })
    })

    describe('stop()', () => {
        it('does nothing when the run id is not found', async () => {
            await expect(runner.stop('non-existent-id')).resolves.toBeUndefined()
        })

        it('aborts a running workflow and results in RUN_FAILED', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            const run = new WorkFlowRun('data', workflow)

            const iter = runner.run(run)[Symbol.asyncIterator]()

            await iter.next()
            await iter.next()

            await runner.stop(run.id)

            const remaining: Array<{ type: string }> = []
            while (true) {
                const step = await iter.next()
                if (step.done) break
                remaining.push(step.value)
            }

            expect(remaining.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_FAILED)).toBe(true)
        })
    })

    describe('ForLoop workflow — state persistence and branch execution', () => {
        it('completes a for-loop workflow with state tracking across iterations', async () => {
            const workflow = new WorkFlow('wf-loop', 'Loop')
            workflow.addNode('input', new InputNode())
            workflow.addNode('loop', new ForLoopNode())
            workflow.addNode('body', new TransformNode())

            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'loop',
                targetPort: 'value'
            })
            workflow.addConnection({
                id: 'c2',
                sourceNodeId: 'loop',
                sourcePort: 'loop',
                targetNodeId: 'body',
                targetPort: 'value'
            })
            workflow.addConnection({
                id: 'c3',
                sourceNodeId: 'body',
                sourcePort: 'result',
                targetNodeId: 'loop',
                targetPort: 'loop'
            })

            workflow.setConfigOverride('loop', 'iterations', { type: 'constant', data: 2 })
            workflow.setConfigOverride('body', 'expression', { type: 'constant', data: '$input' })

            const run = new WorkFlowRun('hello', workflow)
            const events = await collectEvents(runner.run(run))

            expect(events.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_COMPLETED)).toBe(true)
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        })
    })

    describe('Merge workflow — parallel inputs to same node', () => {
        it('completes when two connections from same source feed a MergeNode', async () => {
            const workflow = new WorkFlow('wf-merge', 'Merge')
            workflow.addNode('input', new InputNode())
            workflow.addNode('merge', new MergeNode())

            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'a'
            })
            workflow.addConnection({
                id: 'c2',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'b'
            })

            const run = new WorkFlowRun('data', workflow)
            const events = await collectEvents(runner.run(run))

            expect(events.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_COMPLETED)).toBe(true)
            expect(run.getOutput()['merge']).toEqual({ result: { a: 'data', b: 'data' } })
        })
    })

    describe('executeRun — no start nodes', () => {
        it('rejects when workflow has no start nodes (all non-start)', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('transform', new TransformNode())
            const run = new WorkFlowRun('x', workflow)

            await expect(collectEvents(runner.run(run))).rejects.toThrow('has no start nodes')
        })

        it('rejects when workflow has no nodes at all', async () => {
            const workflow = buildWorkflow()
            const run = new WorkFlowRun('x', workflow)

            await expect(collectEvents(runner.run(run))).rejects.toThrow()
        })
    })

    describe('executeEntry — edge-case branches', () => {
        it('skips a connection when the source port has no output value', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'nonExistentPort',
                targetNodeId: 'transform',
                targetPort: 'value'
            })

            const run = new WorkFlowRun('hello', workflow)
            const events = await collectEvents(runner.run(run))

            const nodeStarted = events.filter(e => e.type === WORKFLOW_EVENT_TYPE.NODE_STARTED)
            expect(nodeStarted).toHaveLength(1)
            expect(events.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_COMPLETED)).toBe(true)
        })

        it('executes merge node fed by two independent start nodes (triggers isReady false then true)', async () => {
            const workflow = new WorkFlow('wf-two-starts', 'Two Starts')
            workflow.addNode('inputA', new InputNode())
            workflow.addNode('inputB', new InputNode())
            workflow.addNode('merge', new MergeNode())

            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'inputA',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'a'
            })
            workflow.addConnection({
                id: 'c2',
                sourceNodeId: 'inputB',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'b'
            })

            const run = new WorkFlowRun('value', workflow)
            const events = await collectEvents(runner.run(run))

            expect(events.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_COMPLETED)).toBe(true)
            expect(run.getOutput()['merge']).toEqual({ result: { a: 'value', b: 'value' } })
        })
    })

    describe('executeNode — intermediate node events', () => {
        it('forwards NODE_EVENT items yielded by the node before it completes', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            workflow.addNode('yielding', new YieldingNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'yielding',
                targetPort: 'value'
            })

            const run = new WorkFlowRun('hello', workflow)
            const events = await collectEvents(runner.run(run))

            const nodeEvent = events.find(e => e.type === WORKFLOW_EVENT_TYPE.NODE_EVENT)
            expect(nodeEvent).toMatchObject({ nodeId: 'yielding', payload: { progress: 'halfway' } })
            expect(run.getOutput()['yielding']).toEqual({ result: 'hello' })
        })
    })

    describe('resolvePorts — port mappings', () => {
        it('applies an expression port mapping instead of passing the raw connection value through', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            workflow.setPortMapping('transform', 'value', [
                { targetParameter: 'value', value: { type: 'expression', expression: '$input.toUpperCase()' } }
            ])
            workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })

            const run = new WorkFlowRun('hello', workflow)
            await collectEvents(runner.run(run))

            expect(run.getOutput()['transform']).toEqual({ result: 'HELLO' })
        })
    })

    describe('stop() — aborting a node that is actively pending', () => {
        it('fails the run via the abort signal when stopped while a node awaits real async work', async () => {
            const workflow = buildWorkflow()
            workflow.addNode('input', new InputNode())
            workflow.addNode('delay', new DelayNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'delay',
                targetPort: 'value'
            })
            workflow.setConfigOverride('delay', 'delayMs', { type: 'constant', data: 2_000 })

            const run = new WorkFlowRun('data', workflow)
            const iter = runner.run(run)[Symbol.asyncIterator]()
            const seen: Array<WorkFlowEvent> = []

            let step = await iter.next()
            while (!step.done) {
                seen.push(step.value)
                if (step.value.type === WORKFLOW_EVENT_TYPE.NODE_STARTED && step.value.nodeId === 'delay') break
                step = await iter.next()
            }

            const pendingNext = iter.next()
            await new Promise(resolve => setTimeout(resolve, 20))
            await runner.stop(run.id)

            step = await pendingNext
            if (!step.done) seen.push(step.value)

            while (!step.done) {
                step = await iter.next()
                if (step.done) break
                seen.push(step.value)
            }

            expect(seen.some(e => e.type === WORKFLOW_EVENT_TYPE.RUN_FAILED)).toBe(true)
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.FAILED)
        }, 10_000)
    })

    describe('executeEntry — aborted before a cascaded entry ever starts', () => {
        it('stops scheduling further nodes once aborted between node completion and the next cascade', async () => {
            const run = new WorkFlowRun('hello', buildTwoNodeWorkflow())
            const iter = runner.run(run)[Symbol.asyncIterator]()
            const seen: Array<WorkFlowEvent> = []

            let step = await iter.next()
            while (!step.done) {
                seen.push(step.value)
                if (step.value.type === WORKFLOW_EVENT_TYPE.NODE_COMPLETED && step.value.nodeId === 'input') break
                step = await iter.next()
            }

            await runner.stop(run.id)

            while (!step.done) {
                step = await iter.next()
                if (step.done) break
                seen.push(step.value)
            }

            const transformStarted = seen.some(
                e => e.type === WORKFLOW_EVENT_TYPE.NODE_STARTED && e.nodeId === 'transform'
            )
            expect(transformStarted).toBe(false)
        })
    })
})
