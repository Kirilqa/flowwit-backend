import { StopWorkFlowRunTool } from '@tool/implementations/workflow/StopWorkFlowRunTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeWorkFlowRunner } from '../../../../../helpers/makeWorkFlow'

describe('StopWorkFlowRunTool', () => {
    it('has correct name', () => {
        expect(new StopWorkFlowRunTool(makeWorkFlowRunner()).name).toBe('workflow_stop')
    })

    it('calls workflowRunner.stop with the runId', async () => {
        const runner = makeWorkFlowRunner()
        const tool = new StopWorkFlowRunTool(runner)
        await tool.execute({ runId: 'run-123' }, 'agent-1', 'session-1')
        expect(runner.stop).toHaveBeenCalledWith('run-123')
    })

    it('returns the runId on success', async () => {
        const tool = new StopWorkFlowRunTool(makeWorkFlowRunner())
        const result = (await tool.execute({ runId: 'run-abc' }, 'agent-1', 'session-1')) as { runId: string }
        expect(result.runId).toBe('run-abc')
    })

    it('throws AgentToolError when runner.stop throws', async () => {
        const runner = makeWorkFlowRunner()
        ;(runner.stop as jest.Mock).mockRejectedValue(new Error('Run not found'))
        const tool = new StopWorkFlowRunTool(runner)
        await expect(tool.execute({ runId: 'bad-run' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('wraps non-Error throws as AgentToolError', async () => {
        const runner = makeWorkFlowRunner()
        ;(runner.stop as jest.Mock).mockRejectedValue('some string error')
        const tool = new StopWorkFlowRunTool(runner)
        await expect(tool.execute({ runId: 'bad-run' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
