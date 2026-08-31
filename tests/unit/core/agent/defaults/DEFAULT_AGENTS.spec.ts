import { createDefaultAgents } from '@agent/defaults/DEFAULT_AGENTS'
import { ProviderInterface } from '@provider'

function makeProvider(name: string, defaultModel: string | null): ProviderInterface {
    return {
        name,
        initialize: () => Promise.reject(new Error('not implemented')),
        getDefaultModel: () => Promise.resolve(defaultModel),
        listModels: () => Promise.reject(new Error('not implemented')),
        getModelInfo: () => Promise.reject(new Error('not implemented')),
        getCapabilities: () => Promise.reject(new Error('not implemented')),
        generate: () => Promise.reject(new Error('not implemented')),
        generateStream: () => {
            throw new Error('not implemented')
        },
        verifyAccess: () => Promise.reject(new Error('not implemented'))
    }
}

describe('createDefaultAgents', () => {
    it('returns exactly one agent', async () => {
        const agents = await createDefaultAgents([makeProvider('openrouter', 'openai/gpt-5.6-luna')])
        expect(agents).toHaveLength(1)
    })

    it('uses the first provider in the array and its own default model', async () => {
        const [agent] = await createDefaultAgents([makeProvider('openrouter', 'openai/gpt-5.6-luna')])
        expect(agent?.provider).toBe('openrouter')
        expect(agent?.model).toBe('openai/gpt-5.6-luna')
    })

    it('prefers the earlier provider in the array when multiple are given', async () => {
        const [agent] = await createDefaultAgents([
            makeProvider('openai', 'gpt-5.6-luna'),
            makeProvider('openrouter', 'openai/gpt-5.6-luna')
        ])
        expect(agent?.provider).toBe('openai')
    })

    it('falls through to the next provider when an earlier one has no default model', async () => {
        const [agent] = await createDefaultAgents([
            makeProvider('ollama', null),
            makeProvider('openai', 'gpt-5.6-luna')
        ])
        expect(agent?.provider).toBe('openai')
        expect(agent?.model).toBe('gpt-5.6-luna')
    })

    it('throws when no provider can resolve a default model', async () => {
        await expect(createDefaultAgents([makeProvider('ollama', null)])).rejects.toThrow(
            'No provider was able to resolve a default model for the starter agent'
        )
    })

    it('throws when given an empty provider list', async () => {
        await expect(createDefaultAgents([])).rejects.toThrow(
            'No provider was able to resolve a default model for the starter agent'
        )
    })

    it('grants broad access via wildcard patterns', async () => {
        const [agent] = await createDefaultAgents([makeProvider('openrouter', 'openai/gpt-5.6-luna')])
        expect(agent?.tools).toEqual(['*'])
        expect(agent?.skills).toEqual(['*'])
    })

    it('has a stable, recognizable id', async () => {
        const [agent] = await createDefaultAgents([makeProvider('openrouter', 'openai/gpt-5.6-luna')])
        expect(agent?.id).toBe('flowwit-start-agent')
    })
})
