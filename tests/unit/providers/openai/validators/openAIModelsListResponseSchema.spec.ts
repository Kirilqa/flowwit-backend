import { openAIModelsListResponseSchema } from '@/providers/openai/validators'

describe('openAIModelsListResponseSchema', () => {
    it('parses a valid models list response', () => {
        const result = openAIModelsListResponseSchema.parse({
            object: 'list',
            data: [{ id: 'gpt-4o', object: 'model', created: 1700000000, owned_by: 'openai' }]
        })

        expect(result.data[0]?.id).toBe('gpt-4o')
    })

    it('rejects a response with the wrong object literal', () => {
        expect(() => openAIModelsListResponseSchema.parse({ object: 'something-else', data: [] })).toThrow()
    })

    it('rejects a model entry missing required fields', () => {
        expect(() => openAIModelsListResponseSchema.parse({ object: 'list', data: [{ id: 'gpt-4o' }] })).toThrow()
    })
})
