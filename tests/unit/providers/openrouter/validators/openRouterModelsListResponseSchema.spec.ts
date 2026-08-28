import { openRouterModelsListResponseSchema } from '@/providers/openrouter/validators'

function makeModel(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'anthropic/claude-3',
        canonical_slug: 'anthropic/claude-3',
        name: 'Claude 3',
        created: 1700000000,
        description: 'A model',
        context_length: 200000,
        architecture: {
            input_modalities: ['text'],
            output_modalities: ['text'],
            tokenizer: 'claude',
            instruct_type: null
        },
        pricing: {
            prompt: '0.000003',
            completion: '0.000015',
            request: '0',
            image: '0',
            web_search: '0',
            internal_reasoning: '0',
            input_cache_read: '0',
            input_cache_write: '0'
        },
        top_provider: null,
        supported_parameters: ['temperature'],
        default_parameters: null,
        expiration_date: null,
        ...overrides
    }
}

describe('openRouterModelsListResponseSchema', () => {
    it('parses a valid models list response', () => {
        const result = openRouterModelsListResponseSchema.parse({ data: [makeModel()] })
        expect(result.data[0]?.id).toBe('anthropic/claude-3')
    })

    it('parses a model with a non-null top_provider', () => {
        const result = openRouterModelsListResponseSchema.parse({
            data: [
                makeModel({
                    top_provider: { context_length: 200000, max_completion_tokens: 8192, is_moderated: true }
                })
            ]
        })
        expect(result.data[0]?.top_provider?.is_moderated).toBe(true)
    })

    it('rejects a model entry missing required fields', () => {
        expect(() => openRouterModelsListResponseSchema.parse({ data: [{ id: 'x' }] })).toThrow()
    })
})
