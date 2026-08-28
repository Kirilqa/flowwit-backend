import {
    InputNode,
    TransformNode,
    MergeNode,
    WorkFlowNodeAlreadyExistsError,
    WorkFlowNodeNotFoundError,
    WorkFlowConnectionError
} from '@workflow'
import { WorkFlow } from '@workflow/implementations/workflow/WorkFlow'

describe('WorkFlow', () => {
    let workflow: WorkFlow

    beforeEach(() => {
        workflow = new WorkFlow('wf-1', 'Test Workflow')
    })

    describe('addNode()', () => {
        it('adds a node with the given id', () => {
            workflow.addNode('input', new InputNode())
            expect(workflow.getEntries()).toHaveLength(1)
            expect(workflow.getEntries()[0]?.id).toBe('input')
        })

        it('initializes empty portMappings and configOverrides', () => {
            workflow.addNode('input', new InputNode())
            const entry = workflow.getEntries()[0]
            expect(entry?.portMappings).toEqual({})
            expect(entry?.configOverrides).toEqual({})
        })

        it('throws WorkFlowNodeAlreadyExistsError for duplicate id', () => {
            workflow.addNode('input', new InputNode())
            expect(() => {
                workflow.addNode('input', new InputNode())
            }).toThrow(WorkFlowNodeAlreadyExistsError)
        })
    })

    describe('removeNode()', () => {
        it('removes the node with the given id', () => {
            workflow.addNode('input', new InputNode())
            workflow.removeNode('input')
            expect(workflow.getEntries()).toHaveLength(0)
        })

        it('cascades removal to all connections involving the node', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            workflow.removeNode('input')
            expect(workflow.getConnections()).toHaveLength(0)
        })

        it('throws WorkFlowNodeNotFoundError for missing id', () => {
            expect(() => {
                workflow.removeNode('missing')
            }).toThrow(WorkFlowNodeNotFoundError)
        })

        it('cascades removal to connections where the removed node is only the target', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            workflow.removeNode('transform')
            expect(workflow.getConnections()).toHaveLength(0)
        })
    })

    describe('addConnection()', () => {
        beforeEach(() => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
        })

        it('adds a connection between two nodes', () => {
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            expect(workflow.getConnections()).toHaveLength(1)
        })

        it('throws WorkFlowNodeNotFoundError when source node does not exist', () => {
            expect(() => {
                workflow.addConnection({
                    id: 'c1',
                    sourceNodeId: 'missing',
                    sourcePort: 'result',
                    targetNodeId: 'transform',
                    targetPort: 'value'
                })
            }).toThrow(WorkFlowNodeNotFoundError)
        })

        it('throws WorkFlowNodeNotFoundError when target node does not exist', () => {
            expect(() => {
                workflow.addConnection({
                    id: 'c1',
                    sourceNodeId: 'input',
                    sourcePort: 'result',
                    targetNodeId: 'missing',
                    targetPort: 'value'
                })
            }).toThrow(WorkFlowNodeNotFoundError)
        })

        it('throws WorkFlowConnectionError when target port already has a connection', () => {
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            expect(() => {
                workflow.addConnection({
                    id: 'c2',
                    sourceNodeId: 'input',
                    sourcePort: 'result',
                    targetNodeId: 'transform',
                    targetPort: 'value'
                })
            }).toThrow(WorkFlowConnectionError)
        })
    })

    describe('removeConnection()', () => {
        beforeEach(() => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
        })

        it('removes the connection with the given id', () => {
            workflow.removeConnection('c1')
            expect(workflow.getConnections()).toHaveLength(0)
        })

        it('throws WorkFlowConnectionError when connection does not exist', () => {
            expect(() => {
                workflow.removeConnection('missing')
            }).toThrow(WorkFlowConnectionError)
        })
    })

    describe('validate()', () => {
        it('returns valid=true for a workflow with a start node', () => {
            workflow.addNode('input', new InputNode())
            expect(workflow.validate().valid).toBe(true)
        })

        it('returns valid=false with error when no start node exists', () => {
            workflow.addNode('transform', new TransformNode())
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.length).toBeGreaterThan(0)
        })

        it('returns empty errors array for a valid workflow', () => {
            workflow.addNode('input', new InputNode())
            expect(workflow.validate().errors).toHaveLength(0)
        })

        it('reports error when source port does not exist in node output schema', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'nonExistent',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('nonExistent'))).toBe(true)
        })

        it('reports error when target port does not exist in node input schema', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'nonExistent'
            })
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('nonExistent'))).toBe(true)
        })

        it('tracks multiple incoming connections to the same target node', () => {
            workflow.addNode('input1', new InputNode())
            workflow.addNode('input2', new InputNode())
            workflow.addNode('merge', new MergeNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input1',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'a'
            })
            workflow.addConnection({
                id: 'c2',
                sourceNodeId: 'input2',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'b'
            })
            expect(workflow.validate().valid).toBe(true)
        })

        it('reports error when configOverride key does not exist in node config schema', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            workflow.setConfigOverride('transform', 'badKey', { type: 'constant', data: 'x' })
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('badKey'))).toBe(true)
        })

        it('reports error when portMapping key is not a valid incoming port', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.setPortMapping('transform', 'value', [])
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('portMapping') && e.includes('value'))).toBe(true)
        })

        it('does not report errors for a valid configOverride key and valid portMapping', () => {
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
            workflow.setPortMapping('transform', 'value', [
                { targetParameter: 'value', value: { type: 'constant', data: 'x' } }
            ])
            const result = workflow.validate()
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('reports error when portMapping targetParameter is not in node ports schema', () => {
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
                { targetParameter: 'badParam', value: { type: 'constant', data: 'x' } }
            ])
            const result = workflow.validate()
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('badParam'))).toBe(true)
        })
    })

    describe('findStartEntries()', () => {
        it('returns nodes with isStart=true that have no incoming connections', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            const starts = workflow.findStartEntries()
            expect(starts).toHaveLength(1)
            expect(starts[0]?.id).toBe('input')
        })

        it('returns empty when no start nodes exist', () => {
            workflow.addNode('transform', new TransformNode())
            expect(workflow.findStartEntries()).toHaveLength(0)
        })
    })

    describe('findFinalEntries()', () => {
        it('returns nodes with no outgoing connections', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            const finals = workflow.findFinalEntries()
            expect(finals).toHaveLength(1)
            expect(finals[0]?.id).toBe('transform')
        })

        it('returns all nodes when there are no connections', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            expect(workflow.findFinalEntries()).toHaveLength(2)
        })
    })

    describe('setPortMapping()', () => {
        it('sets the port mapping for the given node and port', () => {
            workflow.addNode('input', new InputNode())
            workflow.setPortMapping('input', '$input', [
                { targetParameter: 'value', value: { type: 'constant', data: 'test' } }
            ])
            const entry = workflow.findEntryById('input')
            expect(entry?.portMappings['$input']).toHaveLength(1)
        })

        it('throws WorkFlowNodeNotFoundError for missing node', () => {
            expect(() => {
                workflow.setPortMapping('missing', '$input', [])
            }).toThrow(WorkFlowNodeNotFoundError)
        })
    })

    describe('setConfigOverride()', () => {
        it('sets the config override for the given node and key', () => {
            workflow.addNode('transform', new TransformNode())
            workflow.setConfigOverride('transform', 'expression', { type: 'constant', data: '$input' })
            const entry = workflow.findEntryById('transform')
            expect(entry?.configOverrides['expression']).toEqual({ type: 'constant', data: '$input' })
        })

        it('throws WorkFlowNodeNotFoundError for missing node', () => {
            expect(() => {
                workflow.setConfigOverride('missing', 'key', { type: 'constant', data: 'val' })
            }).toThrow(WorkFlowNodeNotFoundError)
        })
    })

    describe('findEntryById()', () => {
        it('returns the entry with the matching id', () => {
            workflow.addNode('input', new InputNode())
            expect(workflow.findEntryById('input')?.id).toBe('input')
        })

        it('returns null when no entry matches', () => {
            expect(workflow.findEntryById('missing')).toBeNull()
        })
    })

    describe('constructor', () => {
        it('stores id, name, and description', () => {
            const wf = new WorkFlow('wf-id', 'My Workflow', 'Description text')
            expect(wf.id).toBe('wf-id')
            expect(wf.name).toBe('My Workflow')
            expect(wf.description).toBe('Description text')
        })

        it('has no description when not provided', () => {
            const wf = new WorkFlow('wf-id', 'My Workflow')
            expect(wf.description).toBeUndefined()
        })
    })

    describe('multiple connections from one source port', () => {
        it('allows the same source port to connect to multiple targets', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addNode('merge', new MergeNode())
            workflow.addConnection({
                id: 'c1',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            workflow.addConnection({
                id: 'c2',
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'merge',
                targetPort: 'a'
            })
            expect(workflow.getConnections()).toHaveLength(2)
        })
    })

    describe('addConnection() — id generation', () => {
        it('auto-generates a uuid connection id when id is not provided', () => {
            workflow.addNode('input', new InputNode())
            workflow.addNode('transform', new TransformNode())
            workflow.addConnection({
                sourceNodeId: 'input',
                sourcePort: 'result',
                targetNodeId: 'transform',
                targetPort: 'value'
            })
            const conn = workflow.getConnections()[0]
            expect(typeof conn?.id).toBe('string')
            expect(conn?.id).toBeTruthy()
        })
    })
})
