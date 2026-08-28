import { ListWorkFlowNodesTool } from '@tool/implementations/workflow/ListWorkFlowNodesTool'
import { WorkFlowNodeRegistry } from '@workflow'
import { makeWorkFlowNodeRegistry } from '../../../../../helpers/makeWorkFlow'

describe('ListWorkFlowNodesTool', () => {
    it('has correct name', () => {
        expect(new ListWorkFlowNodesTool(makeWorkFlowNodeRegistry()).name).toBe('workflow_nodes')
    })

    it('returns summary for each registered node type', async () => {
        const tool = new ListWorkFlowNodesTool(makeWorkFlowNodeRegistry())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{ type: string; isStart: boolean }>
        expect(result).toHaveLength(1)
        expect(result[0]?.type).toBe('input')
        expect(result[0]?.isStart).toBe(true)
    })

    it('includes ports, outputs and configSchema in each summary', async () => {
        const tool = new ListWorkFlowNodesTool(makeWorkFlowNodeRegistry())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            ports: unknown
            outputs: unknown
            configSchema: unknown
        }>
        expect(result[0]?.ports).toBeDefined()
        expect(result[0]?.outputs).toBeDefined()
        expect(result[0]).toHaveProperty('configSchema')
    })

    it('returns empty array for empty node registry', async () => {
        const registry = new WorkFlowNodeRegistry()
        const tool = new ListWorkFlowNodesTool(registry)
        const result = await tool.execute({}, 'agent-1', 'session-1')
        expect(result).toEqual([])
    })
})
