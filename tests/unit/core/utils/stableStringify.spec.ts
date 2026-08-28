import { stableStringify } from '@core/utils/stableStringify'

describe('stableStringify', () => {
    describe('primitives', () => {
        it('stringifies a number', () => {
            expect(stableStringify(42)).toBe('42')
        })

        it('stringifies a negative number', () => {
            expect(stableStringify(-7)).toBe('-7')
        })

        it('stringifies a string', () => {
            expect(stableStringify('hello')).toBe('"hello"')
        })

        it('stringifies a boolean true', () => {
            expect(stableStringify(true)).toBe('true')
        })

        it('stringifies a boolean false', () => {
            expect(stableStringify(false)).toBe('false')
        })

        it('stringifies null', () => {
            expect(stableStringify(null)).toBe('null')
        })
    })

    describe('arrays', () => {
        it('stringifies an empty array', () => {
            expect(stableStringify([])).toBe('[]')
        })

        it('stringifies an array of numbers', () => {
            expect(stableStringify([1, 2, 3])).toBe('[1,2,3]')
        })

        it('stringifies an array of strings', () => {
            expect(stableStringify(['a', 'b'])).toBe('["a","b"]')
        })

        it('stringifies a nested array', () => {
            expect(
                stableStringify([
                    [1, 2],
                    [3, 4]
                ])
            ).toBe('[[1,2],[3,4]]')
        })

        it('preserves array element order', () => {
            expect(stableStringify([3, 1, 2])).toBe('[3,1,2]')
        })
    })

    describe('objects', () => {
        it('stringifies an empty object', () => {
            expect(stableStringify({})).toBe('{}')
        })

        it('stringifies a flat object', () => {
            expect(stableStringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
        })

        it('sorts object keys alphabetically', () => {
            expect(stableStringify({ z: 1, a: 2, m: 3 })).toBe('{"a":2,"m":3,"z":1}')
        })

        it('produces identical output regardless of key insertion order', () => {
            const obj1 = { b: 2, a: 1 }
            const obj2 = { a: 1, b: 2 }
            expect(stableStringify(obj1)).toBe(stableStringify(obj2))
        })

        it('filters out undefined values', () => {
            expect(stableStringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}')
        })

        it('stringifies nested objects with sorted keys', () => {
            expect(stableStringify({ outer: { z: 1, a: 2 } })).toBe('{"outer":{"a":2,"z":1}}')
        })

        it('handles objects with null values', () => {
            expect(stableStringify({ a: null })).toBe('{"a":null}')
        })

        it('handles objects with boolean values', () => {
            expect(stableStringify({ flag: true })).toBe('{"flag":true}')
        })

        it('handles mixed nested structures', () => {
            const input = { b: [1, 2], a: { z: 'x', m: null } }
            expect(stableStringify(input)).toBe('{"a":{"m":null,"z":"x"},"b":[1,2]}')
        })
    })
})
