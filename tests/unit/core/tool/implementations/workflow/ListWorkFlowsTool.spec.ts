import { ListWorkFlowsTool } from '@tool/implementations/workflow/ListWorkFlowsTool'
import { makeWorkFlow, makeWorkFlowRegistry } from '../../../../../helpers/makeWorkFlow'

describe('ListWorkFlowsTool', () => {
    it('has correct name', () => {
        expect(new ListWorkFlowsTool(makeWorkFlowRegistry()).name).toBe('workflow_list')
    })

    it('returns empty array when registry is empty', async () => {
        const tool = new ListWorkFlowsTool(makeWorkFlowRegistry())
        const result = await tool.execute({}, 'agent-1', 'session-1')
        expect(result).toEqual([])
    })

    it('returns summary for each registered workflow', async () => {
        const registry = makeWorkFlowRegistry([makeWorkFlow('wf-1', 'Alpha'), makeWorkFlow('wf-2', 'Beta')])
        const tool = new ListWorkFlowsTool(registry)
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{ id: string; name: string }>
        expect(result).toHaveLength(2)
        expect(result.map(r => r.id)).toEqual(expect.arrayContaining(['wf-1', 'wf-2']))
        expect(result.map(r => r.name)).toEqual(expect.arrayContaining(['Alpha', 'Beta']))
    })

    it('includes nodeCount and connectionCount in summary', async () => {
        const registry = makeWorkFlowRegistry([makeWorkFlow()])
        const tool = new ListWorkFlowsTool(registry)
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            nodeCount: number
            connectionCount: number
        }>
        expect(result[0]?.nodeCount).toBe(1)
        expect(result[0]?.connectionCount).toBe(0)
    })
})
