import { lmStudioModelsResponseSchema } from '@/providers/lmstudio/validators'

describe('lmStudioModelsResponseSchema', () => {
    it('parses a real /api/v1/models response shape', () => {
        const result = lmStudioModelsResponseSchema.parse({
            models: [
                {
                    type: 'llm',
                    publisher: 'lmstudio-community',
                    key: 'qwen2.5-0.5b-instruct',
                    display_name: 'Qwen2.5 0.5B Instruct',
                    architecture: 'qwen2',
                    quantization: { name: 'Q8_0', bits_per_weight: 8 },
                    size_bytes: 531068224,
                    params_string: '0.5B',
                    loaded_instances: [],
                    max_context_length: 32768,
                    format: 'gguf',
                    capabilities: { vision: false, trained_for_tool_use: true },
                    description: null
                },
                {
                    type: 'embedding',
                    publisher: 'nomic-ai',
                    key: 'text-embedding-nomic-embed-text-v1.5',
                    quantization: { name: 'Q4_K_M', bits_per_weight: 4 },
                    size_bytes: 84106624,
                    params_string: null,
                    loaded_instances: [],
                    max_context_length: 2048,
                    format: 'gguf'
                }
            ]
        })

        expect(result.models[0]?.type).toBe('llm')
        expect(result.models[0]?.capabilities?.trained_for_tool_use).toBe(true)
        expect(result.models[1]?.type).toBe('embedding')
        expect('capabilities' in result.models[1]!).toBe(false)
    })

    it('parses a model with no optional fields present', () => {
        const result = lmStudioModelsResponseSchema.parse({
            models: [{ type: 'llm', key: 'bare-model' }]
        })

        expect('max_context_length' in result.models[0]!).toBe(false)
        expect('capabilities' in result.models[0]!).toBe(false)
    })

    it('accepts the vlm model type', () => {
        const result = lmStudioModelsResponseSchema.parse({
            models: [
                { type: 'vlm', key: 'some-vision-model', capabilities: { vision: true, trained_for_tool_use: false } }
            ]
        })

        expect(result.models[0]?.type).toBe('vlm')
    })

    it('parses an empty model list', () => {
        const result = lmStudioModelsResponseSchema.parse({ models: [] })
        expect(result.models).toEqual([])
    })

    it('rejects a response missing the models array', () => {
        expect(() => lmStudioModelsResponseSchema.parse({})).toThrow()
    })

    it('rejects an unknown model type', () => {
        expect(() => lmStudioModelsResponseSchema.parse({ models: [{ type: 'unknown', key: 'x' }] })).toThrow()
    })

    it('rejects a model entry missing key', () => {
        expect(() => lmStudioModelsResponseSchema.parse({ models: [{ type: 'llm' }] })).toThrow()
    })
})
