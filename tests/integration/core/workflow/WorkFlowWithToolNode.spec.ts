import {
    WorkFlow,
    WorkFlowRun,
    WorkFlowRunner,
    InputNode,
    ToolNode,
    WORKFLOW_EVENT_TYPE,
    WORKFLOW_RUN_STATUS
} from '@workflow'
import { ToolRegistry, ToolInterface } from '@tool'
import { collectEvents } from '../../../helpers/collectEvents'

const greetTool: ToolInterface = {
    name: 'greet',
    description: 'Returns a greeting for the given name',
    parameters: { name: { type: 'string' } },
    execute: async (args: Record<string, unknown>) => `Hello, ${String(args['name'])}!`
}

const doubleTool: ToolInterface = {
    name: 'double',
    description: 'Doubles the given number',
    parameters: { value: { type: 'number' } },
    execute: async (args: Record<string, unknown>) => {
        const value = args['value']
        if (typeof value !== 'number') return NaN
        return value * 2
    }
}

function buildWorkflow(toolName: string): WorkFlow {
    const toolRegistry = new ToolRegistry()
    toolRegistry.register('greet', greetTool)
    toolRegistry.register('double', doubleTool)

    const workflow = new WorkFlow('wf-tool-test', 'Tool Node Test')
    workflow.addNode('input', new InputNode())
    workflow.addNode('process', new ToolNode(toolRegistry))
    workflow.addConnection({
        id: 'c1',
        sourceNodeId: 'input',
        sourcePort: 'result',
        targetNodeId: 'process',
        targetPort: 'args'
    })
    workflow.setConfigOverride('process', 'toolName', { type: 'constant', data: toolName })
    return workflow
}

describe('WorkFlow with ToolNode (integration)', () => {
    const runner = new WorkFlowRunner()

    it('runs to RUN_COMPLETED when tool executes successfully', async () => {
        const workflow = buildWorkflow('greet')
        const run = new WorkFlowRun({ name: 'World' }, workflow)
        const events = await collectEvents(runner.run(run))

        const lastEvent = events[events.length - 1]
        expect(lastEvent?.type).toBe(WORKFLOW_EVENT_TYPE.RUN_COMPLETED)
        expect(run.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
    })

    it('executes the tool with args from the connected port', async () => {
        const workflow = buildWorkflow('greet')
        const run = new WorkFlowRun({ name: 'World' }, workflow)

        await collectEvents(runner.run(run))

        expect(run.getOutput()['process']).toEqual({ result: 'Hello, World!' })
    })

    it('passes numeric args correctly to the tool', async () => {
        const workflow = buildWorkflow('double')
        const run = new WorkFlowRun({ value: 21 }, workflow)

        await collectEvents(runner.run(run))

        expect(run.getOutput()['process']).toEqual({ result: 42 })
    })

    it('emits NODE_STARTED and NODE_COMPLETED events for ToolNode', async () => {
        const workflow = buildWorkflow('greet')
        const run = new WorkFlowRun({ name: 'Claude' }, workflow)
        const events = await collectEvents(runner.run(run))
        const types = events.map(e => e.type)

        expect(types).toContain(WORKFLOW_EVENT_TYPE.NODE_STARTED)
        expect(types).toContain(WORKFLOW_EVENT_TYPE.NODE_COMPLETED)
    })

    it('emits RUN_FAILED when the tool is not found in the registry', async () => {
        const workflow = buildWorkflow('nonexistent')
        const run = new WorkFlowRun({ name: 'test' }, workflow)
        const events = await collectEvents(runner.run(run))

        const lastEvent = events[events.length - 1]
        expect(lastEvent?.type).toBe(WORKFLOW_EVENT_TYPE.RUN_FAILED)
        expect(run.status).toBe(WORKFLOW_RUN_STATUS.FAILED)
    })
})
