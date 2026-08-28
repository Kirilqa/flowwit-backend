import { openAIChatCompletionResponseSchema } from '@/providers/openai/validators'

describe('openAIChatCompletionResponseSchema', () => {
    it('parses a minimal valid response', () => {
        const result = openAIChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'gpt-4o',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        expect(result.choices[0]?.message.content).toBe('hello')
    })

    it('parses a response with tool calls', () => {
        const result = openAIChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'gpt-4o',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'search', arguments: '{}' } }]
                    },
                    finish_reason: 'tool_calls'
                }
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        expect(result.choices[0]?.message.tool_calls?.[0]?.function.name).toBe('search')
    })

    it('does not leave explicit undefined keys on absent optional fields', () => {
        const result = openAIChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'gpt-4o',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        const [choice] = result.choices
        if (!choice) throw new Error('Expected at least one choice')

        expect('tool_calls' in choice.message).toBe(false)
        expect('system_fingerprint' in result).toBe(false)
    })

    it('rejects a response missing required fields', () => {
        expect(() =>
            openAIChatCompletionResponseSchema.parse({
                id: 'chatcmpl-1',
                object: 'chat.completion',
                created: 1700000000,
                model: 'gpt-4o',
                choices: []
            })
        ).toThrow()
    })

    it('rejects an unknown finish_reason value', () => {
        expect(() =>
            openAIChatCompletionResponseSchema.parse({
                id: 'chatcmpl-1',
                object: 'chat.completion',
                created: 1700000000,
                model: 'gpt-4o',
                choices: [
                    { index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'something_new' }
                ],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            })
        ).toThrow()
    })
})
