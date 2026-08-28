import { UnregisterMCPTool } from '@tool/implementations/mcp/UnregisterMCPTool'
import { AgentToolError } from '@tool/errors'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'

describe('UnregisterMCPTool', () => {
    it('has correct name', () => {
        const tool = new UnregisterMCPTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('mcp_unregister')
    })

    it('throws AgentToolError when the calling agent is not found', async () => {
        const tool = new UnregisterMCPTool(makeAgentRegistry(), null)
        await expect(tool.execute({ serverName: 'server-a' }, 'nonexistent-caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when the server is not registered for the agent', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), null)
        await expect(tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update removing the server', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [client] })
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), null)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { mcpServers: Array<unknown> }
        expect(patch.mcpServers).toHaveLength(0)
    })

    it('preserves other registered servers when unregistering one', async () => {
        const clientA = makeMCPClient('server-a')
        const clientB = makeMCPClient('server-b')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [clientA, clientB] })
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), null)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { mcpServers: Array<{ alias: string }> }
        expect(patch.mcpServers.map(s => s.alias)).toEqual(['server-b'])
    })

    it('calls repository.update when repository is provided', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [client] })
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), repo)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', { mcpServers: [] })
    })

    it('does not call repository when repository is null', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [client] })
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), null)
        await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns a success message containing the server name', async () => {
        const client = makeMCPClient('server-a')
        const caller = makeAgentInterface({ id: 'caller', mcpServers: [client] })
        const tool = new UnregisterMCPTool(makeAgentRegistry([caller]), null)
        const result = await tool.execute({ serverName: 'server-a' }, 'caller', 'session-1')
        expect(result).toContain('server-a')
    })

    it('throws AgentToolError for invalid schema (empty serverName)', async () => {
        const tool = new UnregisterMCPTool(makeAgentRegistry(), null)
        await expect(tool.execute({ serverName: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
