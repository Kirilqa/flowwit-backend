import { DeleteMCPTool } from '@tool/implementations/mcp/DeleteMCPTool'
import { AgentToolError } from '@tool/errors'
import { MCPServerConfig } from '@mcp'
import { makeMCPServerConfigRepository } from '../../../../../helpers/makeMCPClient'
import { makeMCPServerRegistryMock } from '../../../../../helpers/makeAgent'

const STDIO_CONFIG: MCPServerConfig = { name: 'server-a', type: 'stdio', command: 'run-server' }

describe('DeleteMCPTool', () => {
    it('has correct name', () => {
        const tool = new DeleteMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        expect(tool.name).toBe('mcp_delete')
    })

    it('throws AgentToolError when server does not exist', async () => {
        const tool = new DeleteMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        await expect(tool.execute({ name: 'ghost' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('removes the config and unregisters the client', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const registry = makeMCPServerRegistryMock()
        const tool = new DeleteMCPTool(repo, registry)

        await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')

        expect(repo.delete).toHaveBeenCalledWith('server-a')
        expect(registry.unregister).toHaveBeenCalledWith('server-a')
    })

    it('returns a success message containing the server name', async () => {
        const repo = makeMCPServerConfigRepository([STDIO_CONFIG])
        const tool = new DeleteMCPTool(repo, makeMCPServerRegistryMock())
        const result = await tool.execute({ name: 'server-a' }, 'agent-1', 'session-1')
        expect(result).toContain('server-a')
    })

    it('throws AgentToolError for invalid schema (empty name)', async () => {
        const tool = new DeleteMCPTool(makeMCPServerConfigRepository(), makeMCPServerRegistryMock())
        await expect(tool.execute({ name: '' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
