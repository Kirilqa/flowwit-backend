import { RunWorkFlowTool } from '@tool/implementations/workflow/RunWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { WORKFLOW_EVENT_TYPE, RunStartedEvent } from '@workflow'
import {
    makeWorkFlow,
    makeWorkFlowRegistry,
    makeWorkFlowRunRepository,
    makeWorkFlowRunner,
    makeThrowingWorkFlowRunner
} from '../../../../../helpers/makeWorkFlow'

describe('RunWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry(), makeWorkFlowRunRepository(), makeWorkFlowRunner())
        expect(tool.name).toBe('workflow_run')
    })

    it('throws AgentToolError for unknown workflow ID', async () => {
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry(), makeWorkFlowRunRepository(), makeWorkFlowRunner())
        await expect(tool.execute({ workflowId: 'missing' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('creates a run in the repository', async () => {
        const wf = makeWorkFlow('wf-1')
        const repo = makeWorkFlowRunRepository()
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry([wf]), repo, makeWorkFlowRunner())

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(repo.create).toHaveBeenCalledTimes(1)
    })

    it('returns a runId', async () => {
        const wf = makeWorkFlow('wf-1')
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry([wf]), makeWorkFlowRunRepository(), makeWorkFlowRunner())
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as { runId: string }
        expect(result.runId).toBeDefined()
        expect(typeof result.runId).toBe('string')
    })

    it('passes input to the workflow run', async () => {
        const wf = makeWorkFlow('wf-1')
        const repo = makeWorkFlowRunRepository()
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry([wf]), repo, makeWorkFlowRunner())

        await tool.execute({ workflowId: 'wf-1', input: { key: 'value' } }, 'agent-1', 'session-1')

        const created = (repo.create as jest.Mock).mock.calls[0]?.[0]
        expect(created.input).toEqual({ key: 'value' })
    })

    it('drains the runner events in the background without throwing', async () => {
        const wf = makeWorkFlow('wf-1')
        const event: RunStartedEvent = {
            id: 'event-1',
            runId: 'run-1',
            createdAt: Date.now(),
            type: WORKFLOW_EVENT_TYPE.RUN_STARTED
        }
        const runner = makeWorkFlowRunner([event])
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry([wf]), makeWorkFlowRunRepository(), runner)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')
        await new Promise(resolve => setImmediate(resolve))

        expect(runner.run).toHaveBeenCalledTimes(1)
    })

    it('does not throw when the background run rejects', async () => {
        const wf = makeWorkFlow('wf-1')
        const runner = makeThrowingWorkFlowRunner(new Error('run failed'))
        const tool = new RunWorkFlowTool(makeWorkFlowRegistry([wf]), makeWorkFlowRunRepository(), runner)

        const result = await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')
        await new Promise(resolve => setImmediate(resolve))

        expect(result).toHaveProperty('runId')
    })
})
