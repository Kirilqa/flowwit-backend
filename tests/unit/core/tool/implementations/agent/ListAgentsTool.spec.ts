import { ListAgentsTool } from '@tool/implementations/agent/ListAgentsTool'
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

function makeRawConfig(overrides: Partial<RawAgentConfig> = {}): RawAgentConfig {
    return {
        id: 'a1',
        name: 'Agent',
        role: AGENT_ROLE.ASSISTANT,
        provider: 'anthropic',
        model: 'claude-3',
        systemPrompt: '',
        thinkingStrategy: 'default',
        ...overrides
    }
}

describe('ListAgentsTool', () => {
    it('has name "agent_list"', () => {
        expect(new ListAgentsTool(makeRegistry({}), null).name).toBe('agent_list')
    })

    it('returns empty array when no agents are registered', async () => {
        const tool = new ListAgentsTool(makeRegistry({}), null)
        const result = await tool.execute({}, 'agent', 'session')
        expect(result).toEqual([])
    })

    it('returns summaries for all registered agents', async () => {
        const registry = makeRegistry({
            a1: makeAgent('a1', 'Alpha'),
            a2: makeAgent('a2', 'Beta')
        })
        const tool = new ListAgentsTool(registry, null)
        const result = (await tool.execute({}, 'agent', 'session')) as Array<{ id: string }>
        expect(result).toHaveLength(2)
        expect(result.map(r => r.id)).toContain('a1')
        expect(result.map(r => r.id)).toContain('a2')
    })

    it('does not query the repository when it is null', async () => {
        const registry = makeRegistry({ a1: makeAgent('a1') })
        const tool = new ListAgentsTool(registry, null)
        const result = (await tool.execute({}, 'agent', 'session')) as Array<{ toolPatterns?: Array<string> }>
        expect(result[0]).not.toHaveProperty('toolPatterns')
    })

    it('merges each agent with its matching raw config from the repository', async () => {
        const registry = makeRegistry({
            a1: makeAgent('a1', 'Alpha'),
            a2: makeAgent('a2', 'Beta')
        })
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig({ id: 'a1', tools: ['fs_*'] })])

        const tool = new ListAgentsTool(registry, repo)
        const result = (await tool.execute({}, 'agent', 'session')) as Array<{
            id: string
            toolPatterns?: Array<string>
        }>

        const a1Summary = result.find(r => r.id === 'a1')
        const a2Summary = result.find(r => r.id === 'a2')
        expect(a1Summary?.toolPatterns).toEqual(['fs_*'])
        expect(a2Summary?.toolPatterns).toBeUndefined()
    })
})
