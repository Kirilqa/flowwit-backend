import { UnregisterWorkFlowTool } from '@tool/implementations/workflow/UnregisterWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'
import { makeWorkFlow } from '../../../../../helpers/makeWorkFlow'

describe('UnregisterWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('workflow_unregister')
    })

    it('throws AgentToolError when calling agent is not found', async () => {
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry(), null)
        await expect(tool.execute({ workflowId: 'wf-1' }, 'missing-agent', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when workflow is not registered with agent', async () => {
        const agent = makeAgentInterface({ id: 'agent-1' })
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry([agent]), null)
        await expect(tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update removing the workflow from the list', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1', workflows: [wf] })
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry([agent]), null)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(agent.update).toHaveBeenCalledWith({ workflows: [] })
    })

    it('calls repository.update when repository is provided', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1', workflows: [wf] })
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry([agent]), repo)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(repo.update).toHaveBeenCalledWith('agent-1', { workflows: [] })
    })

    it('returns the unregistered workflowId', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1', workflows: [wf] })
        const tool = new UnregisterWorkFlowTool(makeAgentRegistry([agent]), null)
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as { workflowId: string }
        expect(result.workflowId).toBe('wf-1')
    })
})
