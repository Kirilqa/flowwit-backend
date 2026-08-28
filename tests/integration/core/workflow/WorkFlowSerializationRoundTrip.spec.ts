import {
    WorkFlow,
    WorkFlowRun,
    WorkFlowRunner,
    InputNode,
    TransformNode,
    WorkFlowNodeRegistry,
    serializeWorkFlow,
    deserializeWorkFlow,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS
} from '@workflow'
import { collectEvents } from '../../../helpers/collectEvents'

function buildWorkflow(): WorkFlow {
    const workflow = new WorkFlow('wf-serial-test', 'Round-Trip Test')
    workflow.addNode('input', new InputNode())
    workflow.addNode('upper', new TransformNode())
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'upper',
        targetPort: 'value'
    })
    workflow.setConfigOverride('upper', 'expression', { type: 'constant', data: '$input.toUpperCase()' })
    return workflow
}

function buildNodeRegistry(): WorkFlowNodeRegistry {
    const registry = new WorkFlowNodeRegistry()
    registry.register('input', new InputNode())
    registry.register('transform', new TransformNode())
    return registry
}

describe('WorkFlow serialization round-trip (integration)', () => {
    const runner = new WorkFlowRunner()

    describe('serializeWorkFlow()', () => {
        it('serializes id, name, entries, and connections', () => {
            const serialized = serializeWorkFlow(buildWorkflow())

            expect(serialized.id).toBe('wf-serial-test')
            expect(serialized.name).toBe('Round-Trip Test')
            expect(serialized.entries).toHaveLength(2)
            expect(serialized.connections).toHaveLength(1)
        })

        it('serializes node entry ids and types', () => {
            const serialized = serializeWorkFlow(buildWorkflow())

            const inputEntry = serialized.entries.find(e => e.id === 'input')
            const upperEntry = serialized.entries.find(e => e.id === 'upper')

            expect(inputEntry?.nodeType).toBe('input')
            expect(upperEntry?.nodeType).toBe('transform')
        })

        it('serializes constant-type configOverrides', () => {
            const serialized = serializeWorkFlow(buildWorkflow())
            const upperEntry = serialized.entries.find(e => e.id === 'upper')

            expect(upperEntry?.configOverrides['expression']).toEqual({
                type: 'constant',
                data: '$input.toUpperCase()'
            })
        })

        it('excludes function-type configOverrides', () => {
            const workflow = buildWorkflow()
            workflow.setConfigOverride('upper', 'fn', { type: 'function', fn: input => input })
            const serialized = serializeWorkFlow(workflow)
            const upperEntry = serialized.entries.find(e => e.id === 'upper')

            expect(upperEntry?.configOverrides['fn']).toBeUndefined()
        })

        it('serializes connection with source and target ports', () => {
            const serialized = serializeWorkFlow(buildWorkflow())
            const conn = serialized.connections[0]

            expect(conn?.sourceNodeId).toBe('input')
            expect(conn?.sourcePort).toBe('result')
            expect(conn?.targetNodeId).toBe('upper')
            expect(conn?.targetPort).toBe('value')
        })

        it('includes description when set', () => {
            const workflow = new WorkFlow('wf-desc', 'Named', 'A description')
            workflow.addNode('input', new InputNode())
            const serialized = serializeWorkFlow(workflow)

            expect(serialized.description).toBe('A description')
        })

        it('omits description when not set', () => {
            const serialized = serializeWorkFlow(buildWorkflow())

            expect('description' in serialized).toBe(false)
        })
    })

    describe('deserializeWorkFlow()', () => {
        it('rebuilds a workflow that runs to completion', async () => {
            const registry = buildNodeRegistry()
            const deserialized = deserializeWorkFlow(serializeWorkFlow(buildWorkflow()), registry)
            const run = new WorkFlowRun('hello', deserialized)
            const events = await collectEvents(runner.run(run))

            const lastEvent = events[events.length - 1]
            expect(lastEvent?.type).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
        })

        it('produces the same output as the original workflow', async () => {
            const original = buildWorkflow()
            const registry = buildNodeRegistry()
            const deserialized = deserializeWorkFlow(serializeWorkFlow(original), registry)

            const runOriginal = new WorkFlowRun('world', original)
            const runDeserialized = new WorkFlowRun('world', deserialized)

            await collectEvents(runner.run(runOriginal))
            await collectEvents(runner.run(runDeserialized))

            expect(runOriginal.getOutput()).toEqual(runDeserialized.getOutput())
        })

        it('applies configOverrides from serialized form', async () => {
            const registry = buildNodeRegistry()
            const deserialized = deserializeWorkFlow(serializeWorkFlow(buildWorkflow()), registry)
            const run = new WorkFlowRun('hello', deserialized)

            await collectEvents(runner.run(run))

            expect(run.getOutput()['upper']).toEqual({ result: 'HELLO' })
        })

        it('throws when a node type is not found in the registry', () => {
            const serialized = serializeWorkFlow(buildWorkflow())
            const empty = new WorkFlowNodeRegistry()

            expect(() => deserializeWorkFlow(serialized, empty)).toThrow('not found in registry')
        })

        it('restores connections between nodes', () => {
            const registry = buildNodeRegistry()
            const deserialized = deserializeWorkFlow(serializeWorkFlow(buildWorkflow()), registry)

            expect(deserialized.getConnections()).toHaveLength(1)
            expect(deserialized.getConnections()[0]?.sourceNodeId).toBe('input')
            expect(deserialized.getConnections()[0]?.targetNodeId).toBe('upper')
        })
    })
})
