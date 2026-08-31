import { ollamaTagsResponseSchema } from '@/providers/ollama/validators'

describe('ollamaTagsResponseSchema', () => {
    it('parses a real /api/tags response shape', () => {
        const result = ollamaTagsResponseSchema.parse({
            models: [
                {
                    name: 'qwen2.5:0.5b',
                    model: 'qwen2.5:0.5b',
                    modified_at: '2026-08-30T19:26:19.7506649+06:00',
                    size: 397821319,
                    digest: 'a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67',
                    details: {
                        parent_model: '',
                        format: 'gguf',
                        family: 'qwen2',
                        families: ['qwen2'],
                        parameter_size: '494.03M',
                        quantization_level: 'Q4_K_M',
                        context_length: 32768,
                        embedding_length: 896
                    },
                    capabilities: ['completion', 'tools']
                }
            ]
        })

        expect(result.models[0]?.capabilities).toEqual(['completion', 'tools'])
        expect(result.models[0]?.details.context_length).toBe(32768)
    })

    it('parses a model with no optional detail fields present', () => {
        const result = ollamaTagsResponseSchema.parse({
            models: [
                {
                    name: 'bare-model',
                    model: 'bare-model',
                    modified_at: '2026-08-30T00:00:00Z',
                    size: 1000,
                    digest: 'abc',
                    details: {},
                    capabilities: ['completion']
                }
            ]
        })

        expect('context_length' in result.models[0]!.details).toBe(false)
    })

    it('parses an empty model list', () => {
        const result = ollamaTagsResponseSchema.parse({ models: [] })
        expect(result.models).toEqual([])
    })

    it('rejects a response missing the models array', () => {
        expect(() => ollamaTagsResponseSchema.parse({})).toThrow()
    })

    it('rejects a model entry missing capabilities', () => {
        expect(() =>
            ollamaTagsResponseSchema.parse({
                models: [
                    {
                        name: 'x',
                        model: 'x',
                        modified_at: '2026-08-30T00:00:00Z',
                        size: 1,
                        digest: 'x',
                        details: {}
                    }
                ]
            })
        ).toThrow()
    })
})
