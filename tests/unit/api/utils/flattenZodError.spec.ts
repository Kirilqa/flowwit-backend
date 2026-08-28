import { z } from 'zod'
import { flattenZodError } from '@/api/utils'

describe('flattenZodError', () => {
    it('puts top-level (path-less) issues into formErrors', () => {
        const schema = z.string().refine(() => false, 'always fails')
        const result = schema.safeParse('anything')
        if (result.success) throw new Error('Expected parse to fail')

        expect(flattenZodError(result.error)).toEqual({
            formErrors: ['always fails'],
            fieldErrors: {}
        })
    })

    it('groups field issues by their top-level key', () => {
        const schema = z.object({ name: z.string().min(1), age: z.number() })
        const result = schema.safeParse({ name: '', age: 'not a number' })
        if (result.success) throw new Error('Expected parse to fail')

        const flattened = flattenZodError(result.error)
        expect(flattened.formErrors).toEqual([])
        expect(Object.keys(flattened.fieldErrors).sort()).toEqual(['age', 'name'])
    })

    it('bubbles nested object errors up to the top-level key, matching the deprecated flatten()', () => {
        const schema = z.object({ nested: z.object({ x: z.string(), y: z.number() }) })
        const result = schema.safeParse({ nested: { x: 123, y: 'not a number' } })
        if (result.success) throw new Error('Expected parse to fail')

        // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentionally comparing against the deprecated flatten() to prove our replacement is a byte-for-byte match
        expect(flattenZodError(result.error)).toEqual(result.error.flatten())
    })
})
