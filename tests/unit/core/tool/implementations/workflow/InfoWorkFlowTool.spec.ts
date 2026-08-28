import { InfoWorkFlowTool } from '@tool/implementations/workflow/InfoWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeWorkFlow, makeWorkFlowRegistry } from '../../../../../helpers/makeWorkFlow'

describe('InfoWorkFlowTool', () => {
    it('has correct name', () => {
        expect(new InfoWorkFlowTool(makeWorkFlowRegistry()).name).toBe('workflow_info')
    })

    it('returns serialized workflow for existing ID', async () => {
        const wf = makeWorkFlow('wf-1', 'My WF')
        const tool = new InfoWorkFlowTool(makeWorkFlowRegistry([wf]))
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as {
            id: string
            name: string
        }
        expect(result.id).toBe('wf-1')
        expect(result.name).toBe('My WF')
    })

    it('throws AgentToolError for unknown workflow ID', async () => {
        const tool = new InfoWorkFlowTool(makeWorkFlowRegistry())
        await expect(tool.execute({ workflowId: 'unknown' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
