import { DeleteWorkFlowTool } from '@tool/implementations/workflow/DeleteWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeWorkFlow, makeWorkFlowRegistry, makeWorkFlowRepository } from '../../../../../helpers/makeWorkFlow'

describe('DeleteWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new DeleteWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry())
        expect(tool.name).toBe('workflow_delete')
    })

    it('deletes from repository and unregisters from registry', async () => {
        const wf = makeWorkFlow('wf-1')
        const repo = makeWorkFlowRepository()
        const registry = makeWorkFlowRegistry([wf])
        const tool = new DeleteWorkFlowTool(repo, registry)

        await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')

        expect(repo.delete).toHaveBeenCalledWith('wf-1')
        expect(registry.unregister).toHaveBeenCalledWith('wf-1')
    })

    it('returns the deleted workflowId', async () => {
        const tool = new DeleteWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry([makeWorkFlow('wf-1')]))
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as { workflowId: string }
        expect(result.workflowId).toBe('wf-1')
    })

    it('throws AgentToolError for unknown workflow ID', async () => {
        const tool = new DeleteWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry())
        await expect(tool.execute({ workflowId: 'missing' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
