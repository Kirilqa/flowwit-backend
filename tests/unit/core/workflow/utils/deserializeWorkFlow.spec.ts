import {
    WorkFlowNodeInterface,
    InputNode,
    TransformNode,
    WorkFlowNodeNotFoundError,
    SerializedWorkFlow
} from '@workflow'
import { deserializeWorkFlow } from '@workflow/utils/deserializeWorkFlow'
import { makeSimpleRegistry } from '../../../../helpers/makeRegistry'

function makeRegistry(nodes: Record<string, WorkFlowNodeInterface> = {}) {
    return makeSimpleRegistry<WorkFlowNodeInterface>(nodes)
}

function makeSerializedWorkFlow(overrides: Partial<SerializedWorkFlow> = {}): SerializedWorkFlow {
    return {
        id: 'wf-1',
        name: 'Test Workflow',
        entries: [],
        connections: [],
        ...overrides
    }
}

describe('deserializeWorkFlow', () => {
    it('restores workflow id and name', () => {
        const registry = makeRegistry({})
        const serialized = makeSerializedWorkFlow({ id: 'wf-42', name: 'My Workflow' })
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.id).toBe('wf-42')
        expect(workflow.name).toBe('My Workflow')
    })

    it('restores optional description when present', () => {
        const registry = makeRegistry({})
        const serialized = makeSerializedWorkFlow({ description: 'desc text' })
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.description).toBe('desc text')
    })

    it('omits description when not in serialized data', () => {
        const registry = makeRegistry({})
        const serialized = makeSerializedWorkFlow()
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.description).toBeUndefined()
    })

    it('creates nodes from the registry', () => {
        const registry = makeRegistry({ input: new InputNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [{ id: 'entry-1', nodeType: 'input', portMappings: {}, configOverrides: {} }]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.getEntries()).toHaveLength(1)
        expect(workflow.getEntries()[0]?.id).toBe('entry-1')
    })

    it('throws WorkFlowNodeNotFoundError for unknown node type', () => {
        const registry = makeRegistry({})
        const serialized = makeSerializedWorkFlow({
            entries: [{ id: 'entry-1', nodeType: 'unknown-node', portMappings: {}, configOverrides: {} }]
        })
        expect(() => deserializeWorkFlow(serialized, registry)).toThrow(WorkFlowNodeNotFoundError)
    })

    it('restores connections between nodes', () => {
        const registry = makeRegistry({ input: new InputNode(), transform: new TransformNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [
                { id: 'input', nodeType: 'input', portMappings: {}, configOverrides: {} },
                { id: 'transform', nodeType: 'transform', portMappings: {}, configOverrides: {} }
            ],
            connections: [
                {
                    id: 'c1',
                    sourceNodeId: 'input',
                    sourcePort: 'result',
                    targetNodeId: 'transform',
                    targetPort: 'value'
                }
            ]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.getConnections()).toHaveLength(1)
        expect(workflow.getConnections()[0]?.id).toBe('c1')
    })

    it('restores constant configOverrides', () => {
        const registry = makeRegistry({ transform: new TransformNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [
                {
                    id: 'transform',
                    nodeType: 'transform',
                    portMappings: {},
                    configOverrides: { expression: { type: 'constant', data: '$input' } }
                }
            ]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        const entry = workflow.findEntryById('transform')
        expect(entry?.configOverrides['expression']).toEqual({ type: 'constant', data: '$input' })
    })

    it('restores non-empty portMappings', () => {
        const registry = makeRegistry({ input: new InputNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [
                {
                    id: 'input',
                    nodeType: 'input',
                    portMappings: {
                        $input: [{ targetParameter: 'value', value: { type: 'constant', data: 'x' } }]
                    },
                    configOverrides: {}
                }
            ]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        const entry = workflow.findEntryById('input')
        expect(entry?.portMappings['$input']).toHaveLength(1)
    })

    it('skips empty portMapping arrays', () => {
        const registry = makeRegistry({ input: new InputNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [
                {
                    id: 'input',
                    nodeType: 'input',
                    portMappings: { $input: [] },
                    configOverrides: {}
                }
            ]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        const entry = workflow.findEntryById('input')
        expect(entry?.portMappings['$input']).toBeUndefined()
    })

    it('creates multiple nodes from multiple entries', () => {
        const registry = makeRegistry({ input: new InputNode(), transform: new TransformNode() })
        const serialized = makeSerializedWorkFlow({
            entries: [
                { id: 'n1', nodeType: 'input', portMappings: {}, configOverrides: {} },
                { id: 'n2', nodeType: 'transform', portMappings: {}, configOverrides: {} }
            ]
        })
        const workflow = deserializeWorkFlow(serialized, registry)
        expect(workflow.getEntries()).toHaveLength(2)
    })
})
