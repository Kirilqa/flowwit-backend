import { UpdateMCPTool } from '@tool/implementations/mcp/UpdateMCPTool'
import { AgentToolError } from '@tool/errors'
import { MCP_SERVER_STATUS, MCPClientFactory, MCPServerConfig } from '@mcp'
import { makeMCPClient, makeMCPServerConfigRepository } from '../../../../../helpers/makeMCPClient'
import { makeMCPServerRegistryMock } from '../../../../../helpers/makeAgent'

const STDIO_CONFIG: MCPServerConfig = { name: 'server-a', type: 'stdio', command: 'run-server' }
const HTTP_CONFIG: MCPServerConfig = { name: 'server-b', type: 'streamable-http', url: 'https://example.com' }

describe('UpdateMCPTool', () => {
    it('has correct name', () => {
        const tool = new UpdateMCPTool(
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            jest.fn() as MCPClientFactory
        )
        expect(tool.name).toBe('mcp_update')
    })

    it('throws AgentToolError when server does not exist', async () => {
        const tool = new UpdateMCPTool(
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            jest.fn() as MCPClientFactory
        )
        await expect(tool.execute({ name: 'ghost' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('updates stdio fields via the repository', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const tool = new UpdateMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute(
            { name: 'server-a', command: 'new-command', args: ['--x'], env: { A: '1' } },
            'agent-1',
            'session-1'
        )
        expect(repo.update).toHaveBeenCalledWith('server-a', { command: 'new-command', args: ['--x'], env: { A: '1' } })
    })

    it('updates http fields via the repository', async () => {
        const repo = makeMCPServerConfigRepository([HTTP_CONFIG])
        const tool = new UpdateMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute(
            { name: 'server-b', url: 'https://new.example.com', headers: { X: 'y' } },
            'agent-1',
            'session-1'
        )
        expect(repo.update).toHaveBeenCalledWith('server-b', { url: 'https://new.example.com', headers: { X: 'y' } })
    })

    it('sends an empty patch when no optional fields are provided', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const tool = new UpdateMCPTool(repo, makeMCPServerRegistryMock(), (() => makeMCPClient()) as MCPClientFactory)
        await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('server-a', {})
    })

    it('registers the reconnected client in the server registry', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const registry = makeMCPServerRegistryMock()
        const client = makeMCPClient('server-a')
        const tool = new UpdateMCPTool(repo, registry, (() => client) as MCPClientFactory)
        await tool.execute({ name: 'server-a', command: 'new' }, 'agent-1', 'session-1')
        expect(registry.register).toHaveBeenCalledWith('server-a', client)
    })

    it('returns the real client status instead of a hardcoded value', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const client = makeMCPClient()
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.ERROR)
        const factory: MCPClientFactory = () => client

        const tool = new UpdateMCPTool(repo, makeMCPServerRegistryMock(), factory)
        const result = (await tool.execute({ name: 'server-a', command: 'new-command' }, 'agent-1', 'session-1')) as {
            status: string
        }

        expect(result.status).toBe(MCP_SERVER_STATUS.ERROR)
    })

    it('throws AgentToolError for invalid schema (empty name)', async () => {
        const tool = new UpdateMCPTool(
            makeMCPServerConfigRepository(),
            makeMCPServerRegistryMock(),
            jest.fn() as MCPClientFactory
        )
        await expect(tool.execute({ name: '' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
