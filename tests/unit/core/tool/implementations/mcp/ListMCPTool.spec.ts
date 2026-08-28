import { ListMCPTool } from '@tool/implementations/mcp/ListMCPTool'
import { MCP_SERVER_STATUS, MCPServerConfig } from '@mcp'
import { MCPServerSummary } from '@tool/implementations/mcp/types'
import { makeMCPClient, makeMCPServerConfigRepository } from '../../../../../helpers/makeMCPClient'
import { makeMCPServerRegistryMock } from '../../../../../helpers/makeAgent'

const STDIO_CONFIG: MCPServerConfig = { name: 'server-a', type: 'stdio', command: 'run-server' }

describe('ListMCPTool', () => {
    it('has correct name', () => {
        const tool = new ListMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        expect(tool.name).toBe('mcp_list')
    })

    it('returns an empty array when no servers are configured', async () => {
        const tool = new ListMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        const result = await tool.execute({}, 'agent-1', 'session-1')
        expect(result).toEqual([])
    })

    it('reports the actual status of a registered client', async () => {
        const client = makeMCPClient('server-a')
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.CONNECTED)

        const tool = new ListMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock([client]))
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<MCPServerSummary>

        expect(result[0]?.status).toBe(MCP_SERVER_STATUS.CONNECTED)
    })

    it('reports disconnected when the server is not present in the registry', async () => {
        const tool = new ListMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<MCPServerSummary>

        expect(result[0]?.status).toBe(MCP_SERVER_STATUS.DISCONNECTED)
    })

    it('includes the config and name for each server', async () => {
        const tool = new ListMCPTool(makeMCPServerConfigRepository([STDIO_CONFIG]), makeMCPServerRegistryMock())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<MCPServerSummary>
        expect(result[0]).toMatchObject({ name: 'server-a', config: STDIO_CONFIG })
    })

    it('lists multiple configured servers', async () => {
        const configB: MCPServerConfig = { name: 'server-b', type: 'sse', url: 'https://example.com' }
        const tool = new ListMCPTool(
            makeMCPServerConfigRepository([STDIO_CONFIG, configB]),
            makeMCPServerRegistryMock()
        )
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<MCPServerSummary>
        expect(result.map(r => r.name).sort()).toEqual(['server-a', 'server-b'])
    })
})
