import { DeleteAgentTool } from '@tool/implementations/agent/DeleteAgentTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'

describe('DeleteAgentTool', () => {
    it('has correct name', () => {
        const tool = new DeleteAgentTool(makeAgentRegistry(), null)
        expect(tool.name).toBe('agent_delete')
    })

    it('throws AgentToolError when agent tries to delete itself', async () => {
        const agent = makeAgentInterface({ id: 'self' })
        const registry = makeAgentRegistry([agent])
        const tool = new DeleteAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'self' }, 'self', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when target agent is not found', async () => {
        const registry = makeAgentRegistry()
        const tool = new DeleteAgentTool(registry, null)
        await expect(tool.execute({ agentId: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('unregisters the agent from the registry', async () => {
        const agent = makeAgentInterface({ id: 'to-delete' })
        const registry = makeAgentRegistry([agent])
        const tool = new DeleteAgentTool(registry, null)
        await tool.execute({ agentId: 'to-delete' }, 'caller', 'session-1')
        expect(registry.unregister).toHaveBeenCalledWith('to-delete')
    })

    it('calls repository.delete when repository is provided', async () => {
        const agent = makeAgentInterface({ id: 'to-delete' })
        const registry = makeAgentRegistry([agent])
        const repo = makeRawAgentConfigRepository()
        const tool = new DeleteAgentTool(registry, repo)
        await tool.execute({ agentId: 'to-delete' }, 'caller', 'session-1')
        expect(repo.delete).toHaveBeenCalledWith('to-delete')
    })

    it('does not call repository when repository is null', async () => {
        const agent = makeAgentInterface({ id: 'to-delete' })
        const registry = makeAgentRegistry([agent])
        const repo = makeRawAgentConfigRepository()
        const tool = new DeleteAgentTool(registry, null)
        await tool.execute({ agentId: 'to-delete' }, 'caller', 'session-1')
        expect(repo.delete).not.toHaveBeenCalled()
    })

    it('returns a success message', async () => {
        const agent = makeAgentInterface({ id: 'to-delete' })
        const registry = makeAgentRegistry([agent])
        const tool = new DeleteAgentTool(registry, null)
        const result = await tool.execute({ agentId: 'to-delete' }, 'caller', 'session-1')
        expect(typeof result).toBe('string')
        expect(result).toContain('to-delete')
    })

    it('throws AgentToolError for invalid schema', async () => {
        const registry = makeAgentRegistry()
        const tool = new DeleteAgentTool(registry, null)
        await expect(tool.execute({ agentId: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
