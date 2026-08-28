import { InfoWorkFlowRunTool } from '@tool/implementations/workflow/InfoWorkFlowRunTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { WORKFLOW_RUN_STATUS, WorkFlowRun, SerializedWorkFlowRun, WORKFLOW_NODE_STATE_STATUS } from '@workflow'
import { makeWorkFlow, makeWorkFlowRun, makeWorkFlowRunRepository } from '../../../../../helpers/makeWorkFlow'

describe('InfoWorkFlowRunTool', () => {
    it('has correct name', () => {
        expect(new InfoWorkFlowRunTool(makeWorkFlowRunRepository()).name).toBe('workflow_run_info')
    })

    it('returns run detail for existing runId', async () => {
        const run = makeWorkFlowRun('wf-1')
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({ runId: run.id }, 'agent-1', 'session-1')) as {
            id: string
            workflowId: string
            status: string
        }
        expect(result.id).toBe(run.id)
        expect(result.workflowId).toBe('wf-1')
        expect(result.status).toBe(WORKFLOW_RUN_STATUS.PENDING)
    })

    it('returns nodeStates keyed by node id', async () => {
        const run = makeWorkFlowRun()
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({ runId: run.id }, 'agent-1', 'session-1')) as {
            nodeStates: Record<string, { executions: Array<unknown> }>
        }
        expect(result.nodeStates).toHaveProperty('start')
        expect(result.nodeStates['start']?.executions).toEqual([])
    })

    it('includes input and output fields', async () => {
        const wf = makeWorkFlow()
        const run = new WorkFlowRun({ key: 'value' }, wf)
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({ runId: run.id }, 'agent-1', 'session-1')) as {
            input: unknown
            output: Record<string, unknown>
        }
        expect(result.input).toEqual({ key: 'value' })
        expect(result.output).toBeDefined()
    })

    it('throws AgentToolError for unknown runId', async () => {
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository())
        await expect(tool.execute({ runId: 'missing' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('includes error field in execution when node execution has an error', async () => {
        const wf = makeWorkFlow('wf-1')
        const serialized: SerializedWorkFlowRun = {
            id: 'run-err',
            workflowId: 'wf-1',
            status: WORKFLOW_RUN_STATUS.FAILED,
            input: null,
            entries: [
                {
                    id: 'start',
                    nodeType: 'input',
                    portMappings: {},
                    configOverrides: {},
                    executions: {
                        'exec-err': {
                            executionId: 'exec-err',
                            status: WORKFLOW_NODE_STATE_STATUS.FAILED,
                            receivedPorts: {},
                            resolvedPorts: {},
                            resolvedConfig: {},
                            error: 'Something went wrong',
                            startedAt: 1000,
                            completedAt: 2000
                        }
                    }
                }
            ],
            connections: [],
            createdAt: 0,
            updatedAt: 0
        }
        const run = new WorkFlowRun(null, wf, serialized)
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({ runId: 'run-err' }, 'agent-1', 'session-1')) as {
            nodeStates: Record<string, { executions: Array<{ error?: string }> }>
        }
        expect(result.nodeStates['start']?.executions[0]?.error).toBe('Something went wrong')
    })

    it('includes execution details when node has completed executions', async () => {
        const wf = makeWorkFlow('wf-1')
        const serialized: SerializedWorkFlowRun = {
            id: 'run-1',
            workflowId: 'wf-1',
            status: WORKFLOW_RUN_STATUS.COMPLETED,
            input: null,
            entries: [
                {
                    id: 'start',
                    nodeType: 'input',
                    portMappings: {},
                    configOverrides: {},
                    executions: {
                        'exec-1': {
                            executionId: 'exec-1',
                            status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
                            receivedPorts: {},
                            resolvedPorts: { $input: 'hello' },
                            resolvedConfig: {},
                            output: { result: 'world' },
                            startedAt: 1000,
                            completedAt: 2000
                        }
                    }
                }
            ],
            connections: [],
            createdAt: 0,
            updatedAt: 0
        }
        const run = new WorkFlowRun(null, wf, serialized)
        const tool = new InfoWorkFlowRunTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({ runId: 'run-1' }, 'agent-1', 'session-1')) as {
            nodeStates: Record<
                string,
                {
                    executions: Array<{
                        executionId: string
                        input?: unknown
                        output?: unknown
                        startedAt?: number
                        completedAt?: number
                    }>
                }
            >
        }
        const exec = result.nodeStates['start']?.executions[0]
        expect(exec?.executionId).toBe('exec-1')
        expect(exec?.input).toEqual({ $input: 'hello' })
        expect(exec?.output).toEqual({ result: 'world' })
        expect(exec?.startedAt).toBe(1000)
        expect(exec?.completedAt).toBe(2000)
    })
})
