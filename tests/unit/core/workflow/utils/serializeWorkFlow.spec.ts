import { WorkFlow, InputNode, TransformNode } from '@workflow'
import { serializeWorkFlow } from '@workflow/utils/serializeWorkFlow'

describe('serializeWorkFlow', () => {
    it('includes workflow id, name, and description', () => {
        const workflow = new WorkFlow('wf-1', 'My Workflow', 'A description')
        workflow.addNode('input', new InputNode())
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.id).toBe('wf-1')
        expect(serialized.name).toBe('My Workflow')
        expect(serialized.description).toBe('A description')
    })

    it('omits description field when not set', () => {
        const workflow = new WorkFlow('wf-1', 'My Workflow')
        workflow.addNode('input', new InputNode())
        const serialized = serializeWorkFlow(workflow)
        expect('description' in serialized).toBe(false)
    })

    it('serializes each entry with id and nodeType', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries).toHaveLength(1)
        expect(serialized.entries[0]?.id).toBe('input')
        expect(serialized.entries[0]?.nodeType).toBe('input')
    })

    it('serializes all connections', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        workflow.addNode('transform', new TransformNode())
        workflow.addConnection({
            id: 'c1',
            sourceNodeId: 'input',
            sourcePort: 'result',
            targetNodeId: 'transform',
            targetPort: 'value'
        })
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.connections).toHaveLength(1)
        expect(serialized.connections[0]?.id).toBe('c1')
    })

    it('serializes constant configOverrides', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('transform', new TransformNode())
        workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.configOverrides['expression']).toEqual({ type: 'constant', data: '$input' })
    })

    it('serializes expression configOverrides', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('transform', new TransformNode())
        workflow.setConfigOverride('transform', 'expression', { type: 'expression', expression: '$input * 2' })
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.configOverrides['expression']).toEqual({
            type: 'expression',
            expression: '$input * 2'
        })
    })

    it('excludes function-type configOverrides from serialization', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('transform', new TransformNode())
        workflow.setConfigOverride('transform', 'expression', { type: 'function', fn: () => 'hello' })
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.configOverrides['expression']).toBeUndefined()
    })

    it('serializes non-function portMappings', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        workflow.setPortMapping('input', '$input', [
            { targetParameter: 'value', value: { type: 'constant', data: 'x' } }
        ])
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.portMappings['$input']).toHaveLength(1)
    })

    it('excludes function-type portMappings', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        workflow.setPortMapping('input', '$input', [
            { targetParameter: 'a', value: { type: 'constant', data: 'x' } },
            { targetParameter: 'b', value: { type: 'function', fn: () => 'y' } }
        ])
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.portMappings['$input']).toHaveLength(1)
    })

    it('omits portMapping entry entirely when all mappings are functions', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        workflow.setPortMapping('input', '$input', [
            { targetParameter: 'a', value: { type: 'function', fn: () => 'y' } }
        ])
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.entries[0]?.portMappings['$input']).toBeUndefined()
    })

    it('produces empty entries and connections for an empty workflow-like structure', () => {
        const workflow = new WorkFlow('wf-1', 'Test')
        workflow.addNode('input', new InputNode())
        const serialized = serializeWorkFlow(workflow)
        expect(serialized.connections).toHaveLength(0)
    })
})
