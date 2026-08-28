import { UnregisterAgentTool } from '@tool/implementations/agent/UnregisterAgentTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'

describe('UnregisterAgentTool', () => {
    it('has correct name', () => {
        const tool = new UnregisterAgentTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('agent_unregister')
    })

    it('throws AgentToolError when the caller agent is not found', async () => {
        const registry = makeAgentRegistry()
        const tool = new UnregisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'sub' }, 'nonexistent', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when sub-agent is not registered', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller])
        const tool = new UnregisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'sub' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update removing the sub-agent', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub] })
        const registry = makeAgentRegistry([caller, sub])
        const tool = new UnregisterAgentTool(registry, null)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { agents: Array<unknown> }
        expect(patch.agents).toHaveLength(0)
    })

    it('calls repository.update when repository is provided', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub] })
        const registry = makeAgentRegistry([caller, sub])
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterAgentTool(registry, repo)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', expect.objectContaining({ agents: [] }))
    })

    it('does not call repository when repository is null', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub] })
        const registry = makeAgentRegistry([caller, sub])
        const repo = makeRawAgentConfigRepository()
        const tool = new UnregisterAgentTool(registry, null)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns a success message containing the sub-agent id', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub] })
        const registry = makeAgentRegistry([caller, sub])
        const tool = new UnregisterAgentTool(registry, null)
        const result = await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(typeof result).toBe('string')
        expect(result).toContain('sub')
    })

    it('preserves other sub-agents when unregistering one', async () => {
        const sub1 = makeAgentInterface({ id: 'sub-1' })
        const sub2 = makeAgentInterface({ id: 'sub-2' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub1, sub2] })
        const registry = makeAgentRegistry([caller, sub1, sub2])
        const tool = new UnregisterAgentTool(registry, null)
        await tool.execute({ agentId: 'sub-1' }, 'caller', 'session-1')
        const updateCall = (caller.update as jest.Mock).mock.calls[0]
        const patch = updateCall?.[0] as { agents: Array<{ config: { id: string } }> }
        expect(patch.agents).toHaveLength(1)
        expect(patch.agents[0]?.config.id).toBe('sub-2')
    })
})
