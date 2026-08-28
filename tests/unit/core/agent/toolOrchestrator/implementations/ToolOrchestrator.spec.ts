import { ToolOrchestrator } from '@agent/toolOrchestrator/implementations/ToolOrchestrator'
import { ToolCall, ToolResult } from '@tool/types'
import { MCP_SERVER_STATUS, MCPServerCapabilities } from '@mcp'
import { WorkFlow, WorkFlowRunner, InputNode } from '@workflow'
import {
    makeAgentConfig,
    makeAgentInterface,
    makeSessionManager,
    makeSkillMock,
    makeToolMock
} from '../../../../../helpers/makeAgent'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'

function makeOrchestrator(): ToolOrchestrator {
    return new ToolOrchestrator(makeSessionManager(), new WorkFlowRunner(), [])
}

function makeWorkFlow(id = 'wf-1'): WorkFlow {
    const workflow = new WorkFlow(id, 'Test WF')
    workflow.addNode('input', new InputNode())
    return workflow
}

function fullCapabilities(overrides: Partial<MCPServerCapabilities> = {}): MCPServerCapabilities {
    return {
        version: '1.0',
        hasTools: false,
        hasResources: false,
        hasPrompts: false,
        hasLogging: false,
        toolsListChanged: false,
        resourcesListChanged: false,
        resourcesSubscribe: false,
        promptsListChanged: false,
        ...overrides
    }
}

describe('ToolOrchestrator', () => {
    describe('buildPool()', () => {
        it('includes defaultTools in the pool', async () => {
            const defaultTool = makeToolMock('done')
            const orchestrator = new ToolOrchestrator(makeSessionManager(), new WorkFlowRunner(), [defaultTool])

            const pool = await orchestrator.buildPool(makeAgentConfig())

            expect(pool['done']).toBe(defaultTool)
        })

        it('includes config.tools in the pool', async () => {
            const tool = makeToolMock('read_file')
            const orchestrator = makeOrchestrator()

            const pool = await orchestrator.buildPool(makeAgentConfig({ tools: [tool] }))

            expect(pool['read_file']).toBe(tool)
        })

        it('wraps config.skills as SkillAdapter with skill__ prefix', async () => {
            const skill = makeSkillMock({ name: 'coding' })
            const orchestrator = makeOrchestrator()

            const pool = await orchestrator.buildPool(makeAgentConfig({ skills: [skill] }))

            expect(pool['skill__coding']).toBeDefined()
        })

        it('wraps config.agents as AgentAdapter with agent__ prefix', async () => {
            const subAgent = makeAgentInterface({ name: 'Helper' })
            const orchestrator = makeOrchestrator()

            const pool = await orchestrator.buildPool(makeAgentConfig({ agents: [subAgent] }))

            expect(pool['agent__Helper']).toBeDefined()
        })

        it('wraps config.workflows as WorkFlowAdapter with workflow__ prefix', async () => {
            const workflow = makeWorkFlow('my-wf')
            const orchestrator = makeOrchestrator()

            const pool = await orchestrator.buildPool(makeAgentConfig({ workflows: [workflow] }))

            expect(pool['workflow__my-wf']).toBeDefined()
        })

        it('returns only defaultTools when config has no extra dependencies', async () => {
            const defaultTool = makeToolMock('done')
            const orchestrator = new ToolOrchestrator(makeSessionManager(), new WorkFlowRunner(), [defaultTool])

            const pool = await orchestrator.buildPool(makeAgentConfig())

            expect(Object.keys(pool)).toEqual(['done'])
        })

        describe('MCP servers', () => {
            it('skips servers that are not connected', async () => {
                const client = makeMCPClient('offline-server')
                client.getStatus.mockReturnValue(MCP_SERVER_STATUS.DISCONNECTED)
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasTools: true }))
                const orchestrator = makeOrchestrator()

                await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(client.listTools).not.toHaveBeenCalled()
            })

            it('does not fetch tools/resources/prompts when capabilities is null', async () => {
                const client = makeMCPClient('no-caps-server')
                client.getCapabilities.mockReturnValue(null)
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(client.listTools).not.toHaveBeenCalled()
                expect(client.listResources).not.toHaveBeenCalled()
                expect(client.listPrompts).not.toHaveBeenCalled()
                expect(Object.keys(pool)).toEqual([])
            })

            it('adds an adapter for each MCP tool, named server__toolName', async () => {
                const client = makeMCPClient('my-server')
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasTools: true }))
                client.listTools.mockResolvedValue([{ name: 'search', inputSchema: {} }])
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(pool['my-server__search']).toBeDefined()
            })

            it('adds an adapter for each MCP resource, named server__resource__resourceName', async () => {
                const client = makeMCPClient('my-server')
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasResources: true }))
                client.listResources.mockResolvedValue([{ uri: 'file:///a', name: 'notes' }])
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(pool['my-server__resource__notes']).toBeDefined()
            })

            it('adds an adapter for each MCP prompt, named server__prompt__promptName', async () => {
                const client = makeMCPClient('my-server')
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasPrompts: true }))
                client.listPrompts.mockResolvedValue([{ name: 'summarize' }])
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(pool['my-server__prompt__summarize']).toBeDefined()
            })

            it('sanitizes special characters in the server alias', async () => {
                const client = makeMCPClient('my server!')
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasTools: true }))
                client.listTools.mockResolvedValue([{ name: 'search', inputSchema: {} }])
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(pool['my_server___search']).toBeDefined()
            })

            it('sanitizes special characters in the tool name', async () => {
                const client = makeMCPClient('my-server')
                client.getCapabilities.mockReturnValue(fullCapabilities({ hasTools: true }))
                client.listTools.mockResolvedValue([{ name: 'do thing!', inputSchema: {} }])
                const orchestrator = makeOrchestrator()

                const pool = await orchestrator.buildPool(makeAgentConfig({ mcpServers: [client] }))

                expect(pool['my-server__do_thing_']).toBeDefined()
            })
        })
    })

    describe('buildTools()', () => {
        it('returns an empty array for an empty pool', () => {
            const orchestrator = makeOrchestrator()
            expect(orchestrator.buildTools({})).toEqual([])
        })

        it('maps each tool to a function-type Tool definition', () => {
            const tool = makeToolMock('read_file')
            const orchestrator = makeOrchestrator()

            const tools = orchestrator.buildTools({ read_file: tool })

            expect(tools).toEqual([
                {
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }
            ])
        })
    })

    describe('execute()', () => {
        const toolCall: ToolCall = { id: 'call-1', name: 'read_file', arguments: { path: 'a.txt' } }

        it('returns an error result when the tool is not found in the pool', async () => {
            const orchestrator = makeOrchestrator()

            const result = await orchestrator.execute(toolCall, {}, 'agent-1', 'session-1')

            expect(result).toEqual<ToolResult>({
                id: 'call-1',
                name: 'read_file',
                output: 'Tool "read_file" not found',
                isError: true
            })
        })

        it('returns the tool output on success', async () => {
            const tool = makeToolMock('read_file')
            ;(tool.execute as jest.Mock).mockResolvedValue('file contents')
            const orchestrator = makeOrchestrator()

            const result = await orchestrator.execute(toolCall, { read_file: tool }, 'agent-1', 'session-1')

            expect(result).toEqual<ToolResult>({
                id: 'call-1',
                name: 'read_file',
                output: 'file contents',
                isError: false
            })
        })

        it('passes agentId, sessionId, workingDirectory through to tool.execute', async () => {
            const tool = makeToolMock('read_file')
            const orchestrator = makeOrchestrator()

            await orchestrator.execute(toolCall, { read_file: tool }, 'agent-1', 'session-1', '/work/dir')

            expect(tool.execute).toHaveBeenCalledWith({ path: 'a.txt' }, 'agent-1', 'session-1', '/work/dir')
        })

        it('catches a thrown error and returns it as an error result', async () => {
            const tool = makeToolMock('read_file')
            ;(tool.execute as jest.Mock).mockRejectedValue(new Error('disk full'))
            const orchestrator = makeOrchestrator()

            const result = await orchestrator.execute(toolCall, { read_file: tool }, 'agent-1', 'session-1')

            expect(result.isError).toBe(true)
            expect(result.output).toContain('disk full')
        })

        it('resolves normally when a signal is provided but never aborts', async () => {
            const tool = makeToolMock('read_file')
            ;(tool.execute as jest.Mock).mockResolvedValue('ok')
            const orchestrator = makeOrchestrator()
            const controller = new AbortController()

            const result = await orchestrator.execute(
                toolCall,
                { read_file: tool },
                'agent-1',
                'session-1',
                undefined,
                controller.signal
            )

            expect(result).toEqual<ToolResult>({ id: 'call-1', name: 'read_file', output: 'ok', isError: false })
        })

        it('returns an aborted error result when the signal aborts before the tool resolves', async () => {
            const tool = makeToolMock('read_file')
            ;(tool.execute as jest.Mock).mockReturnValue(new Promise(() => {}))
            const orchestrator = makeOrchestrator()
            const controller = new AbortController()

            const resultPromise = orchestrator.execute(
                toolCall,
                { read_file: tool },
                'agent-1',
                'session-1',
                undefined,
                controller.signal
            )
            controller.abort()
            const result = await resultPromise

            expect(result.isError).toBe(true)
            expect(result.output).toContain('was aborted')
        })
    })
})
