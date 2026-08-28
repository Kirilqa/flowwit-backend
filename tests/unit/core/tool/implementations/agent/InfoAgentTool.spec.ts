import { InfoAgentTool } from '@tool/implementations/agent/InfoAgentTool'
import { AgentToolError } from '@tool/errors'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { AgentConfig } from '@agent/types/AgentConfig'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'

function makeAgentConfig(id: string, name = 'Agent'): AgentConfig {
    return {
        id,
        name,
        role: AGENT_ROLE.ASSISTANT,
        model: 'claude-3',
        systemPrompt: '',
        provider: { name: 'anthropic' } as AgentConfig['provider'],
        thinkingStrategy: { name: 'default' } as AgentConfig['thinkingStrategy']
    }
}

function makeAgent(id: string, name = 'Agent'): AgentInterface {
    return {
        config: makeAgentConfig(id, name),
        update: jest.fn(),
        run: async function* () {},
        stop: async () => {}
    }
}

function makeRegistry(agents: Record<string, AgentInterface> = {}) {
    return makeSimpleRegistry<AgentInterface>(agents)
}

describe('InfoAgentTool', () => {
    it('has name "agent_info"', () => {
        expect(new InfoAgentTool(makeRegistry({}), null).name).toBe('agent_info')
    })

    it('throws AgentToolError when agent is not found', async () => {
        const tool = new InfoAgentTool(makeRegistry({}), null)
        await expect(tool.execute({ agentId: 'missing' }, 'agent', 'session')).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when agentId is missing', async () => {
        const tool = new InfoAgentTool(makeRegistry({}), null)
        await expect(tool.execute({}, 'agent', 'session')).rejects.toThrow(AgentToolError)
    })

    it('returns summary for the requested agent', async () => {
        const registry = makeRegistry({ a1: makeAgent('a1', 'Alpha') })
        const tool = new InfoAgentTool(registry, null)
        const result = (await tool.execute({ agentId: 'a1' }, 'agent', 'session')) as { id: string; name: string }
        expect(result.id).toBe('a1')
        expect(result.name).toBe('Alpha')
    })

    it('does not query the repository when it is null', async () => {
        const registry = makeRegistry({ a1: makeAgent('a1') })
        const tool = new InfoAgentTool(registry, null)
        const result = (await tool.execute({ agentId: 'a1' }, 'agent', 'session')) as { toolPatterns?: Array<string> }
        expect(result).not.toHaveProperty('toolPatterns')
    })

    it('includes pattern fields from the repository raw config when provided', async () => {
        const registry = makeRegistry({ a1: makeAgent('a1') })
        const repo = makeRawAgentConfigRepository()
        const rawConfig: RawAgentConfig = {
            id: 'a1',
            name: 'Agent',
            role: AGENT_ROLE.ASSISTANT,
            provider: 'anthropic',
            model: 'claude-3',
            systemPrompt: '',
            thinkingStrategy: 'default',
            tools: ['fs_*']
        }
        ;(repo.findById as jest.Mock).mockResolvedValue(rawConfig)

        const tool = new InfoAgentTool(registry, repo)
        const result = (await tool.execute({ agentId: 'a1' }, 'agent', 'session')) as { toolPatterns?: Array<string> }
        expect(result.toolPatterns).toEqual(['fs_*'])
    })
})
