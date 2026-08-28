import { WorkFlow, InputNode, TransformNode, WORKFLOW_NODE_STATE_STATUS, WORKFLOW_RUN_STATUS } from '@workflow'
import { WorkFlowRun } from '@workflow/implementations/run/WorkFlowRun'

function makeRun(input: unknown = 'test'): { run: WorkFlowRun; workflow: WorkFlow } {
    const workflow = new WorkFlow('wf-1', 'Test')
    workflow.addNode('input', new InputNode())
    return { run: new WorkFlowRun(input, workflow), workflow }
}

describe('WorkFlowRun', () => {
    describe('constructor', () => {
        it('starts in PENDING status', () => {
            const { run } = makeRun()
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.PENDING)
        })

        it('stores the provided input', () => {
            const { run } = makeRun('my-input')
            expect(run.input).toBe('my-input')
        })

        it('copies entries from the workflow', () => {
            const { run } = makeRun()
            expect(run.getEntries()).toHaveLength(1)
            expect(run.getEntries()[0]?.id).toBe('input')
        })

        it('copies connections from the workflow', () => {
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
            const run = new WorkFlowRun('hello', workflow)
            expect(run.getConnections()).toHaveLength(1)
        })

        it('initializes entries with empty executions', () => {
            const { run } = makeRun()
            expect(run.getEntries()[0]?.executions).toEqual({})
        })
    })

    describe('setStatus()', () => {
        it('updates the run status', () => {
            const { run } = makeRun()
            run.setStatus(WORKFLOW_RUN_STATUS.RUNNING)
            expect(run.status).toBe(WORKFLOW_RUN_STATUS.RUNNING)
        })
    })

    describe('getEntryById()', () => {
        it('returns the matching entry', () => {
            const { run } = makeRun()
            expect(run.getEntryById('input')?.id).toBe('input')
        })

        it('returns null for missing id', () => {
            const { run } = makeRun()
            expect(run.getEntryById('missing')).toBeNull()
        })
    })

    describe('getOutput()', () => {
        it('returns output of final nodes (no outgoing connections)', () => {
            const { run } = makeRun()
            const entry = run.getEntryById('input')
            if (!entry) throw new Error('Expected entry to exist')
            entry.executions['exec-1'] = {
                executionId: 'exec-1',
                status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
                receivedPorts: { $input: 'hello' },
                output: { result: 'hello' }
            }
            expect(run.getOutput()['input']).toEqual({ result: 'hello' })
        })

        it('excludes nodes that have outgoing connections', () => {
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
            const run = new WorkFlowRun('hello', workflow)

            const transformEntry = run.getEntryById('transform')
            if (!transformEntry) throw new Error('Expected entry to exist')
            transformEntry.executions['exec-1'] = {
                executionId: 'exec-1',
                status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
                receivedPorts: { value: 'hello' },
                output: { result: 'hello' }
            }

            const output = run.getOutput()
            expect('input' in output).toBe(false)
            expect(output['transform']).toEqual({ result: 'hello' })
        })

        it('returns undefined output for final nodes with no completed executions', () => {
            const { run } = makeRun()
            expect(run.getOutput()['input']).toBeUndefined()
        })

        it('returns the last completed execution output when there are multiple', () => {
            const { run } = makeRun()
            const entry = run.getEntryById('input')
            if (!entry) throw new Error('Expected entry to exist')
            entry.executions['exec-1'] = {
                executionId: 'exec-1',
                status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
                receivedPorts: {},
                output: { result: 'first' }
            }
            entry.executions['exec-2'] = {
                executionId: 'exec-2',
                status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
                receivedPorts: {},
                output: { result: 'last' }
            }
            expect(run.getOutput()['input']).toEqual({ result: 'last' })
        })

        it('ignores non-completed executions when computing output', () => {
            const { run } = makeRun()
            const entry = run.getEntryById('input')
            if (!entry) throw new Error('Expected entry to exist')
            entry.executions['exec-1'] = {
                executionId: 'exec-1',
                status: WORKFLOW_NODE_STATE_STATUS.FAILED,
                receivedPorts: {},
                output: { result: 'failed-output' }
            }
            expect(run.getOutput()['input']).toBeUndefined()
        })
    })
})
