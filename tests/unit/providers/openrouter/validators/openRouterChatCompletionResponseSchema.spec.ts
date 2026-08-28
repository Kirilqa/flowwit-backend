import { openRouterChatCompletionResponseSchema } from '@/providers/openrouter/validators'

describe('openRouterChatCompletionResponseSchema', () => {
    it('parses a minimal valid response', () => {
        const result = openRouterChatCompletionResponseSchema.parse({
            id: 'gen-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'anthropic/claude-3',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        expect(result.choices[0]?.message.content).toBe('hello')
    })

    it('parses OpenRouter-specific usage fields (cost, is_byok)', () => {
        const result = openRouterChatCompletionResponseSchema.parse({
            id: 'gen-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'anthropic/claude-3',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.002, is_byok: true }
        })

        expect(result.usage.cost).toBe(0.002)
        expect(result.usage.is_byok).toBe(true)
    })

    it('does not leave explicit undefined keys on absent optional fields', () => {
        const result = openRouterChatCompletionResponseSchema.parse({
            id: 'gen-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'anthropic/claude-3',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        const [choice] = result.choices
        if (!choice) throw new Error('Expected at least one choice')

        expect('cost' in result.usage).toBe(false)
        expect('tool_calls' in choice.message).toBe(false)
    })

    it('rejects a response missing required fields', () => {
        expect(() =>
            openRouterChatCompletionResponseSchema.parse({
                id: 'gen-1',
                object: 'chat.completion',
                created: 1700000000,
                model: 'anthropic/claude-3',
                choices: []
            })
        ).toThrow()
    })
})
