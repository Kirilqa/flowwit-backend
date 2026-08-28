import { InfoMCPTool } from '@tool/implementations/mcp/InfoMCPTool'
import { AgentToolError } from '@tool/errors'
import { MCP_SERVER_STATUS, MCPServerConfig } from '@mcp'
import { makeMCPClient, makeMCPServerConfigRepository } from '../../../../../helpers/makeMCPClient'
import { makeMCPServerRegistryMock } from '../../../../../helpers/makeAgent'

const STDIO_CONFIG: MCPServerConfig = { name: 'server-a', type: 'stdio', command: 'run-server' }

describe('InfoMCPTool', () => {
    it('has correct name', () => {
        const tool = new InfoMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        expect(tool.name).toBe('mcp_info')
    })

    it('throws AgentToolError for unknown server', async () => {
        const tool = new InfoMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        await expect(tool.execute({ name: 'ghost' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('reports the actual status of a registered client', async () => {
        const client = makeMCPClient('server-a')
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.ERROR)

        const tool = new InfoMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock([client]))
        const result = (await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')) as { status: string }

        expect(result.status).toBe(MCP_SERVER_STATUS.ERROR)
    })

    it('reports disconnected when the server is not present in the registry', async () => {
        const tool = new InfoMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock())
        const result = (await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')) as { status: string }
        expect(result.status).toBe(MCP_SERVER_STATUS.DISCONNECTED)
    })

    it('returns the config and name for the server', async () => {
        const tool = new InfoMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock())
        const result = await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')
        expect(result).toMatchObject({ name: 'server-a', config: STDIO_CONFIG })
    })

    it('throws AgentToolError for invalid schema (empty name)', async () => {
        const tool = new InfoMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        await expect(tool.execute({ name: '' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
