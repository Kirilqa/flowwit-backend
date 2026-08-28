import { stripUndefined } from '@core/utils'

describe('stripUndefined', () => {
    it('removes top-level keys with undefined values', () => {
        expect(stripUndefined({ a: 1, b: undefined })).toEqual({ a: 1 })
    })

    it('keeps keys with null or falsy-but-defined values', () => {
        expect(stripUndefined({ a: null, b: 0, c: false, d: '' })).toEqual({ a: null, b: 0, c: false, d: '' })
    })

    it('strips undefined keys inside nested objects', () => {
        expect(stripUndefined({ a: { b: 1, c: undefined } })).toEqual({ a: { b: 1 } })
    })

    it('strips undefined keys inside array elements', () => {
        expect(stripUndefined([{ a: 1, b: undefined }, { a: 2 }])).toEqual([{ a: 1 }, { a: 2 }])
    })

    it('leaves primitives untouched', () => {
        expect(stripUndefined('text')).toBe('text')
        expect(stripUndefined(5)).toBe(5)
        expect(stripUndefined(null)).toBe(null)
    })
})
