import { MCPPromptAdapter } from '@tool/implementations/adapter/MCPPromptAdapter'
import { makeMCPClient } from '../../../../../helpers/makeMCPClient'
import { MCPPrompt } from '@mcp'

function makePrompt(overrides: Partial<MCPPrompt> = {}): MCPPrompt {
    return { name: 'my_prompt', description: 'Does a prompt', ...overrides }
}

describe('MCPPromptAdapter', () => {
    describe('constructor', () => {
        it('stores the provided name', () => {
            const client = makeMCPClient()
            const adapter = new MCPPromptAdapter('my_prompt', client, makePrompt())
            expect(adapter.name).toBe('my_prompt')
        })

        it('uses prompt.description as description when present', () => {
            const client = makeMCPClient()
            const adapter = new MCPPromptAdapter('p', client, makePrompt({ description: 'custom desc' }))
            expect(adapter.description).toBe('custom desc')
        })

        it('uses fallback description when prompt has no description', () => {
            const client = makeMCPClient()
            const adapter = new MCPPromptAdapter('p', client, { name: 'myp' })
            expect(adapter.description).toContain('myp')
        })

        it('builds empty parameters schema for prompt without arguments', () => {
            const client = makeMCPClient()
            const adapter = new MCPPromptAdapter('p', client, makePrompt())
            expect(adapter.parameters).toEqual({ type: 'object', properties: {}, required: [] })
        })

        it('builds parameters schema with required arg', () => {
            const client = makeMCPClient()
            const prompt = makePrompt({
                arguments: [{ name: 'topic', description: 'What to prompt about', required: true }]
            })
            const adapter = new MCPPromptAdapter('p', client, prompt)
            const params = adapter.parameters as { properties: Record<string, unknown>; required: Array<string> }
            expect(params.properties['topic']).toMatchObject({ type: 'string' })
            expect(params.required).toContain('topic')
        })

        it('excludes optional arguments from required list', () => {
            const client = makeMCPClient()
            const prompt = makePrompt({
                arguments: [{ name: 'lang', required: false }]
            })
            const adapter = new MCPPromptAdapter('p', client, prompt)
            const params = adapter.parameters as { required: Array<string> }
            expect(params.required).not.toContain('lang')
        })

        it('includes description in parameter property when provided', () => {
            const client = makeMCPClient()
            const prompt = makePrompt({
                arguments: [{ name: 'subject', description: 'The subject', required: true }]
            })
            const adapter = new MCPPromptAdapter('p', client, prompt)
            const params = adapter.parameters as { properties: Record<string, { description?: string }> }
            expect(params.properties['subject']?.description).toBe('The subject')
        })
    })

    describe('execute()', () => {
        it('calls client.getPrompt with prompt.name', async () => {
            const client = makeMCPClient()
            client.getPrompt.mockResolvedValue('result text')
            const adapter = new MCPPromptAdapter('alias', client, makePrompt({ name: 'real_prompt' }))
            await adapter.execute({})
            expect(client.getPrompt).toHaveBeenCalledWith('real_prompt', expect.anything())
        })

        it('converts argument values to strings before calling getPrompt', async () => {
            const client = makeMCPClient()
            client.getPrompt.mockResolvedValue('ok')
            const prompt = makePrompt({ arguments: [{ name: 'count', required: true }] })
            const adapter = new MCPPromptAdapter('p', client, prompt)
            await adapter.execute({ count: 42 })
            expect(client.getPrompt).toHaveBeenCalledWith('my_prompt', { count: '42' })
        })

        it('returns the string from client.getPrompt', async () => {
            const client = makeMCPClient()
            client.getPrompt.mockResolvedValue('prompt response')
            const adapter = new MCPPromptAdapter('p', client, makePrompt())
            const result = await adapter.execute({})
            expect(result).toBe('prompt response')
        })
    })
})
