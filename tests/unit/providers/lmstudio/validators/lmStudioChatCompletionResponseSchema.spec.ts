import { lmStudioChatCompletionResponseSchema } from '@/providers/lmstudio/validators'

describe('lmStudioChatCompletionResponseSchema', () => {
    it('parses a minimal valid response', () => {
        const result = lmStudioChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'qwen2.5-0.5b-instruct',
            choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        expect(result.choices[0]?.message.content).toBe('hello')
    })

    it('parses a real LM Studio response with its extra fields ignored', () => {
        const result = lmStudioChatCompletionResponseSchema.parse({
            id: 'chatcmpl-omhevzkkgis9qsth08rsq',
            object: 'chat.completion',
            created: 1788166598,
            model: 'qwen2.5-0.5b-instruct',
            choices: [
                {
                    index: 0,
                    message: { role: 'assistant', content: 'OK, thank you!', reasoning_content: '', tool_calls: [] },
                    logprobs: null,
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 35,
                completion_tokens: 6,
                total_tokens: 41,
                completion_tokens_details: { reasoning_tokens: 0 }
            },
            stats: {},
            system_fingerprint: 'qwen2.5-0.5b-instruct'
        })

        expect(result.choices[0]?.message.content).toBe('OK, thank you!')
        expect(result.system_fingerprint).toBe('qwen2.5-0.5b-instruct')
    })

    it('parses a response with tool calls', () => {
        const result = lmStudioChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'qwen2.5-0.5b-instruct',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: '',
                        tool_calls: [
                            {
                                type: 'function',
                                id: '2nmrWFvVski1AQaOvhoq0SEM6moTXbxM',
                                function: { name: 'get_weather', arguments: '{"city":"Paris"}' }
                            }
                        ]
                    },
                    finish_reason: 'tool_calls'
                }
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })

        expect(result.choices[0]?.message.tool_calls?.[0]?.function.name).toBe('get_weather')
    })

    it('does not leave explicit undefined keys on absent optional fields', () => {
        const result = lmStudioChatCompletionResponseSchema.parse({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1700000000,
            model: 'qwen2.5-0.5b-instruct',
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
            lmStudioChatCompletionResponseSchema.parse({
                id: 'chatcmpl-1',
                object: 'chat.completion',
                created: 1700000000,
                model: 'qwen2.5-0.5b-instruct',
                choices: []
            })
        ).toThrow()
    })

    it('rejects an unknown finish_reason value', () => {
        expect(() =>
            lmStudioChatCompletionResponseSchema.parse({
                id: 'chatcmpl-1',
                object: 'chat.completion',
                created: 1700000000,
                model: 'qwen2.5-0.5b-instruct',
                choices: [
                    { index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'something_new' }
                ],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            })
        ).toThrow()
    })
})
