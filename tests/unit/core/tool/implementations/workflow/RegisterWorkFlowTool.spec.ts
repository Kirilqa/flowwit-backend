import { RegisterWorkFlowTool } from '@tool/implementations/workflow/RegisterWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'
import { makeWorkFlow, makeWorkFlowRegistry } from '../../../../../helpers/makeWorkFlow'

describe('RegisterWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry(), makeAgentRegistry(), null)
        expect(tool.name).toBe('workflow_register')
    })

    it('throws AgentToolError when calling agent is not found', async () => {
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry([makeWorkFlow('wf-1')]), makeAgentRegistry(), null)
        await expect(tool.execute({ workflowId: 'wf-1' }, 'missing-agent', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when workflow is not found', async () => {
        const agent = makeAgentInterface({ id: 'agent-1' })
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry(), makeAgentRegistry([agent]), null)
        await expect(tool.execute({ workflowId: 'missing-wf' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when workflow is already registered', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1', workflows: [wf] })
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry([wf]), makeAgentRegistry([agent]), null)
        await expect(tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update with the new workflow list', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1' })
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry([wf]), makeAgentRegistry([agent]), null)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(agent.update).toHaveBeenCalledWith(
            expect.objectContaining({
                workflows: expect.arrayContaining([expect.objectContaining({ id: 'wf-1' })])
            })
        )
    })

    it('calls repository.update when repository is provided', async () => {
        const wf = makeWorkFlow('wf-1')
        const agent = makeAgentInterface({ id: 'agent-1' })
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry([wf]), makeAgentRegistry([agent]), repo)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(repo.update).toHaveBeenCalledWith(
            'agent-1',
            expect.objectContaining({
                workflows: ['wf-1']
            })
        )
    })

    it('returns WorkFlowSummary for the registered workflow', async () => {
        const wf = makeWorkFlow('wf-1', 'My WF')
        const agent = makeAgentInterface({ id: 'agent-1' })
        const tool = new RegisterWorkFlowTool(makeWorkFlowRegistry([wf]), makeAgentRegistry([agent]), null)
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as {
            id: string
            name: string
        }
        expect(result.id).toBe('wf-1')
        expect(result.name).toBe('My WF')
    })
})
