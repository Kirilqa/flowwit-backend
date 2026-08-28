import { UpdateWorkFlowTool } from '@tool/implementations/workflow/UpdateWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { WorkFlowInterface, WorkFlowNodeRegistry, InputNode, TransformNode } from '@workflow'
import {
    makeWorkFlow,
    makeWorkFlowNodeRegistry,
    makeWorkFlowRegistry,
    makeWorkFlowRepository
} from '../../../../../helpers/makeWorkFlow'

const VALID_ARGS = {
    workflowId: 'wf-1',
    name: 'Updated WF',
    entries: [{ id: 'n1', nodeType: 'input', portMappings: {}, configOverrides: {} }],
    connections: []
}

describe('UpdateWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        expect(tool.name).toBe('workflow_update')
    })

    it('throws AgentToolError for unknown workflowId', async () => {
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        await expect(tool.execute(VALID_ARGS, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls workflowRepository.update with the updated workflow', async () => {
        const wf = makeWorkFlow('wf-1', 'Old Name')
        const repo = makeWorkFlowRepository()
        const registry = makeWorkFlowRegistry([wf])
        const tool = new UpdateWorkFlowTool(repo, registry, makeWorkFlowNodeRegistry())

        await tool.execute(VALID_ARGS, 'agent-1', 'session-1')

        expect(repo.update).toHaveBeenCalledWith('wf-1', expect.objectContaining({ name: 'Updated WF' }))
    })

    it('re-registers updated workflow in registry', async () => {
        const wf = makeWorkFlow('wf-1')
        const registry = makeWorkFlowRegistry([wf])
        const tool = new UpdateWorkFlowTool(makeWorkFlowRepository(), registry, makeWorkFlowNodeRegistry())

        await tool.execute(VALID_ARGS, 'agent-1', 'session-1')

        expect(registry.register).toHaveBeenCalledWith('wf-1', expect.objectContaining({ name: 'Updated WF' }))
    })

    it('returns WorkFlowSummary with the new name', async () => {
        const wf = makeWorkFlow('wf-1', 'Old')
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry([wf]),
            makeWorkFlowNodeRegistry()
        )
        const result = (await tool.execute(VALID_ARGS, 'agent-1', 'session-1')) as { id: string; name: string }
        expect(result.id).toBe('wf-1')
        expect(result.name).toBe('Updated WF')
    })

    it('preserves existing name when name is omitted', async () => {
        const wf = makeWorkFlow('wf-1', 'Keep This')
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry([wf]),
            makeWorkFlowNodeRegistry()
        )
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as { name: string }
        expect(result.name).toBe('Keep This')
    })

    it('updates description when provided', async () => {
        const wf = makeWorkFlow('wf-1', 'My WF')
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry([wf]),
            makeWorkFlowNodeRegistry()
        )
        const result = (await tool.execute(
            {
                workflowId: 'wf-1',
                description: 'A new description'
            },
            'agent-1',
            'session-1'
        )) as { description?: string }
        expect(result.description).toBe('A new description')
    })

    it('throws AgentToolError when new node type is not registered', async () => {
        const wf = makeWorkFlow('wf-1')
        const tool = new UpdateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry([wf]),
            makeWorkFlowNodeRegistry()
        )
        await expect(
            tool.execute(
                {
                    workflowId: 'wf-1',
                    entries: [{ id: 'n1', nodeType: 'nonexistent', portMappings: {}, configOverrides: {} }]
                },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })

    it('auto-generates connection id when not provided', async () => {
        const wf = makeWorkFlow('wf-1')
        const nodeRegistry = new WorkFlowNodeRegistry()
        nodeRegistry.register('input', new InputNode())
        const repo = makeWorkFlowRepository()
        const tool = new UpdateWorkFlowTool(repo, makeWorkFlowRegistry([wf]), nodeRegistry)

        await tool.execute(
            {
                workflowId: 'wf-1',
                entries: [
                    { id: 'n1', nodeType: 'input', portMappings: {}, configOverrides: {} },
                    { id: 'n2', nodeType: 'input', portMappings: {}, configOverrides: {} }
                ],
                connections: [
                    {
                        sourceNodeId: 'n1',
                        sourcePort: 'result',
                        targetNodeId: 'n2',
                        targetPort: 'value'
                    }
                ]
            },
            'agent-1',
            'session-1'
        )

        const updated = (repo.update as jest.Mock).mock.calls[0]?.[1] as WorkFlowInterface
        expect(typeof updated.getConnections()[0]?.id).toBe('string')
        expect(updated.getConnections()[0]?.id).toBeTruthy()
    })

    it('throws AgentToolError when updated workflow fails validation', async () => {
        const wf = makeWorkFlow('wf-1')
        const nodeRegistry = new WorkFlowNodeRegistry()
        nodeRegistry.register('input', new InputNode())
        nodeRegistry.register('transform', new TransformNode())
        const tool = new UpdateWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry([wf]), nodeRegistry)

        await expect(
            tool.execute(
                {
                    workflowId: 'wf-1',
                    entries: [{ id: 'n1', nodeType: 'transform', portMappings: {}, configOverrides: {} }],
                    connections: []
                },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })
})
