import { AddMCPTool } from '@tool/implementations/mcp/AddMCPTool'
import { AgentToolError } from '@tool/errors'
import { MCP_SERVER_STATUS, MCPClientFactory, MCPServerConfig } from '@mcp'
import { makeMCPClient, makeMCPServerConfigRepository } from '../../../../../helpers/makeMCPClient'
import { makeMCPServerRegistryMock } from '../../../../../helpers/makeAgent'

const STDIO_CONFIG: MCPServerConfig = { name: 'server-a', type: 'stdio', command: 'run-server' }

describe('AddMCPTool', () => {
    it('has correct name', () => {
        const tool = new AddMCPTool(
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            jest.fn() as MCPClientFactory
        )
        expect(tool.name).toBe('mcp_add')
    })

    it('throws AgentToolError when server already exists', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const tool = new AddMCPTool(repo, makeMCPServerRegistryMock(), jest.fn() as MCPClientFactory)
        await expect(
            tool.execute({ name: 'server-a', server: { type: 'stdio', command: 'x' } }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('persists a stdio config via the repository', async () => {
        const repo = makeMCPServerConfigRepository()
        const tool = new AddMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute(
            { name: 'server-a', server: { type: 'stdio', command: 'run', args: ['--flag'], env: { X: '1' } } },
            'agent-1',
            'session-1'
        )
        expect(repo.create).toHaveBeenCalledWith({
            name: 'server-a',
            type: 'stdio',
            command: 'run',
            args: ['--flag'],
            env: { X: '1' }
        })
    })

    it('omits optional stdio fields when not provided', async () => {
        const repo = makeMCPServerConfigRepository()
        const tool = new AddMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute({ name: 'server-a', server: { type: 'stdio', command: 'run' } }, 'agent-1', 'session-1')
        const created = (repo.create as jest.Mock).mock.calls[0]?.[0] as MCPServerConfig
        expect(created).not.toHaveProperty('args')
        expect(created).not.toHaveProperty('env')
    })

    it('persists an http config via the repository', async () => {
        const repo = makeMCPServerConfigRepository()
        const tool = new AddMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute(
            {
                name: 'server-a',
                server: { type: 'streamable-http', url: 'https://example.com', headers: { Authorization: 'Bearer x' } }
            },
            'agent-1',
            'session-1'
        )
        expect(repo.create).toHaveBeenCalledWith({
            name: 'server-a',
            type: 'streamable-http',
            url: 'https://example.com',
            headers: { Authorization: 'Bearer x' }
        })
    })

    it('omits optional headers when not provided for an http config', async () => {
        const repo = makeMCPServerConfigRepository()
        const tool = new AddMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute(
            { name: 'server-a', server: { type: 'sse', url: 'https://example.com' } },
            'agent-1',
            'session-1'
        )
        const created = (repo.create as jest.Mock).mock.calls[0]?.[0] as MCPServerConfig
        expect(created).not.toHaveProperty('headers')
    })

    it('registers the created client in the server registry', async () => {
        const registry = makeMCPServerRegistryMock()
        const client = makeMCPClient('server-a')
        const factory: MCPClientFactory = () => client
        const tool = new AddMCPTool(makeMCPServerConfigRepository(), registry, factory)
        await tool.execute({ name: 'server-a', server: { type: 'stdio', command: 'x' } }, 'agent-1', 'session-1')
        expect(registry.register).toHaveBeenCalledWith('server-a', client)
    })

    it('returns the real client status instead of a hardcoded value', async () => {
        const client = makeMCPClient()
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.CONNECTING)
        const factory: MCPClientFactory = () => client

        const tool = new AddMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock(), factory)
        const result = (await tool.execute(
            { name: 'server-a', server: { type: 'stdio', command: 'x' } },
            'agent-1',
            'session-1'
        )) as { status: string }

        expect(result.status).toBe(MCP_SERVER_STATUS.CONNECTING)
    })

    it('throws AgentToolError for invalid schema (missing name)', async () => {
        const tool = new AddMCPTool(
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            jest.fn() as MCPClientFactory
        )
        await expect(tool.execute({ server: { type: 'stdio', command: 'x' } }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })
})
