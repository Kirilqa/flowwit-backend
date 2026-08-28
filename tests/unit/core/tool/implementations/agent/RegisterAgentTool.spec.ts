import { RegisterAgentTool } from '@tool/implementations/agent/RegisterAgentTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'

describe('RegisterAgentTool', () => {
    it('has correct name', () => {
        const tool = new RegisterAgentTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('agent_register')
    })

    it('throws AgentToolError when agent tries to register itself', async () => {
        const self = makeAgentInterface({ id: 'self' })
        const registry = makeAgentRegistry([self])
        const tool = new RegisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'self' }, 'self', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when the caller agent is not found', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const registry = makeAgentRegistry([sub])
        const tool = new RegisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'sub' }, 'nonexistent-caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when the sub-agent is not found', async () => {
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller])
        const tool = new RegisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when sub-agent is already registered', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller', agents: [sub] })
        const registry = makeAgentRegistry([caller, sub])
        const tool = new RegisterAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'sub' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('calls agent.update with the updated agents list', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller, sub])
        const tool = new RegisterAgentTool(registry, null)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(caller.update).toHaveBeenCalledWith(expect.objectContaining({ agents: expect.arrayContaining([sub]) }))
    })

    it('calls repository.update when repository is provided', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller, sub])
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterAgentTool(registry, repo)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('caller', expect.objectContaining({ agents: ['sub'] }))
    })

    it('does not call repository when repository is null', async () => {
        const sub = makeAgentInterface({ id: 'sub' })
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller, sub])
        const repo = makeRawAgentConfigRepository()
        const tool = new RegisterAgentTool(registry, null)
        await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('returns an AgentSummary of the registered sub-agent', async () => {
        const sub = makeAgentInterface({ id: 'sub', name: 'Sub Agent' })
        const caller = makeAgentInterface({ id: 'caller' })
        const registry = makeAgentRegistry([caller, sub])
        const tool = new RegisterAgentTool(registry, null)
        const result = (await tool.execute({ agentId: 'sub' }, 'caller', 'session-1')) as { id: string; name: string }
        expect(result.id).toBe('sub')
        expect(result.name).toBe('Sub Agent')
    })
})
