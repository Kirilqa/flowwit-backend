import { RegisterMCPTool } from '@tool/implementations/mcp/RegisterMCPTool'
import { AgentToolError } from '@tool/errors'
import { MCP_SERVER_STATUS } from '@mcp'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'
import {
    makeAgentInterface,
    makeAgentRegistry,
    makeMCPServerRegistryMock,
    makeRawAgentConfigRepository
} from '../../../../../helpers/makeAgent'

describe('RegisterMCPTool', () => {
    it('has correct name', () => {
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock(), makeAgentRegistry(), null)
        expect(tool.name).toBe('mcp_register')
    })

    it('throws AgentToolError when the calling agent is not found', async () => {
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock(), makeAgentRegistry(), null)
        await expect(tool.execute({ serverName: 'server-a' }, 'nonexistent-caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when the server does not exist in the system', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock(), makeAgentRegistry([caller]), null)
        await expect(tool.execute({ serverName: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when the server is already registered for the agent', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [client] })
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), null)
        await expect(tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update with the updated mcpServers list', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), null)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(caller.update).toHaveBeenCalledWith(
            expect.objectContaining({ mcpServers: expect.arrayContaining([client]) })
        )
    })

    it('preserves already-registered servers when adding a new one', async () => {
        const existing = makeMCPClient('existing-server')
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [existing] })
        const tool = new RegisterMCPTool(
            makeMCPServerRegistryMock([existing, client]),
            makeAgentRegistry([caller]),
            null
        )
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { mcpServers: Array<{ alias: string }> }
        expect(patch.mcpServers.map(s => s.alias).sort()).toEqual(['existing-server', 'server-a'])
    })

    it('persists the alias via the raw agent config repository when provided', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller' })
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), repo)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', { mcpServers: ['server-a'] })
    })

    it('does not call repository when repository is null', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller' })
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), null)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns the real client status instead of a hardcoded value', async () => {
        const client = makeMCPClient('server-a')
        client.getStatus.mockReturnValue(MCP_SERVER_STATUS.CONNECTING)
        const caller = makeAgentInterface({ id: 'caller' })

        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), null)
        const result = (await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')) as { status: string }

        expect(result.status).toBe(MCP_SERVER_STATUS.CONNECTING)
    })

    it('returns the config obtained from the client', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock([client]), makeAgentRegistry([caller]), null)
        const result = await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(client.getConfig).toHaveBeenCalled()
        expect(result).toMatchObject({ name: 'server-a' })
    })

    it('throws AgentToolError for invalid schema (empty serverName)', async () => {
        const tool = new RegisterMCPTool(makeMCPServerRegistryMock(), makeAgentRegistry(), null)
        await expect(tool.execute({ serverName: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
