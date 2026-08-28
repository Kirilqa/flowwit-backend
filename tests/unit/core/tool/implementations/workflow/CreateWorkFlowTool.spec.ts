import { CreateWorkFlowTool } from '@tool/implementations/workflow/CreateWorkFlowTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { WorkFlowInterface, WorkFlowNodeRegistry, InputNode, TransformNode } from '@workflow'
import {
    makeWorkFlowNodeRegistry,
    makeWorkFlowRegistry,
    makeWorkFlowRepository
} from '../../../../../helpers/makeWorkFlow'

const VALID_CREATE_ARGS = {
    name: 'Test WF',
    entries: [{ id: 'n1', nodeType: 'input', portMappings: {}, configOverrides: {} }],
    connections: []
}

describe('CreateWorkFlowTool', () => {
    it('has correct name', () => {
        const tool = new CreateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        expect(tool.name).toBe('workflow_create')
    })

    it('creates workflow and registers it in registry', async () => {
        const registry = makeWorkFlowRegistry()
        const tool = new CreateWorkFlowTool(makeWorkFlowRepository(), registry, makeWorkFlowNodeRegistry())
        await tool.execute(VALID_CREATE_ARGS, 'agent-1', 'session-1')
        expect(registry.register).toHaveBeenCalledTimes(1)
    })

    it('persists workflow via repository.create', async () => {
        const repo = makeWorkFlowRepository()
        const tool = new CreateWorkFlowTool(repo, makeWorkFlowRegistry(), makeWorkFlowNodeRegistry())
        await tool.execute(VALID_CREATE_ARGS, 'agent-1', 'session-1')
        expect(repo.create).toHaveBeenCalledTimes(1)
    })

    it('returns WorkFlowSummary with generated ID and correct name', async () => {
        const tool = new CreateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        const result = (await tool.execute(VALID_CREATE_ARGS, 'agent-1', 'session-1')) as {
            id: string
            name: string
            nodeCount: number
        }
        expect(result.id).toBeDefined()
        expect(result.name).toBe('Test WF')
        expect(result.nodeCount).toBe(1)
    })

    it('includes description when provided', async () => {
        const tool = new CreateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        const result = (await tool.execute(
            { ...VALID_CREATE_ARGS, description: 'A test workflow' },
            'agent-1',
            'session-1'
        )) as { description?: string }
        expect(result.description).toBe('A test workflow')
    })

    it('throws AgentToolError when node type is not registered', async () => {
        const tool = new CreateWorkFlowTool(
            makeWorkFlowRepository(),
            makeWorkFlowRegistry(),
            makeWorkFlowNodeRegistry()
        )
        await expect(
            tool.execute(
                {
                    name: 'Bad WF',
                    entries: [{ id: 'n1', nodeType: 'nonexistent', portMappings: {}, configOverrides: {} }],
                    connections: []
                },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when validation fails (missing start node)', async () => {
        const nodeRegistry = new WorkFlowNodeRegistry()
        const tool = new CreateWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry(), nodeRegistry)
        await expect(
            tool.execute(
                {
                    name: 'Empty WF',
                    entries: [],
                    connections: []
                },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when workflow validate() fails after deserialization', async () => {
        const nodeRegistry = new WorkFlowNodeRegistry()
        nodeRegistry.register('transform', new TransformNode())
        const tool = new CreateWorkFlowTool(makeWorkFlowRepository(), makeWorkFlowRegistry(), nodeRegistry)
        await expect(
            tool.execute(
                {
                    name: 'No Start WF',
                    entries: [{ id: 'n1', nodeType: 'transform', portMappings: {}, configOverrides: {} }],
                    connections: []
                },
                'agent-1',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })

    it('auto-generates connection IDs when not provided', async () => {
        const repo = makeWorkFlowRepository()
        const nodeRegistry = new WorkFlowNodeRegistry()
        nodeRegistry.register('input', new InputNode())
        const tool = new CreateWorkFlowTool(repo, makeWorkFlowRegistry(), nodeRegistry)

        await tool.execute(
            {
                name: 'WF With Connection',
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

        const created = (repo.create as jest.Mock).mock.calls[0]?.[0] as WorkFlowInterface
        expect(created.getConnections()[0]?.id).toBeDefined()
    })
})
