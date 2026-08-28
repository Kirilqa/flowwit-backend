import { encodeImageDataAsBase64 } from '@core/provider/utils/encodeImageDataAsBase64'

describe('encodeImageDataAsBase64', () => {
    it('returns a string input unchanged', () => {
        expect(encodeImageDataAsBase64('already-base64')).toBe('already-base64')
    })

    it('encodes a Buffer as base64', () => {
        const buffer = Buffer.from('hello')
        expect(encodeImageDataAsBase64(buffer)).toBe(buffer.toString('base64'))
    })

    it('encodes an ArrayBuffer as base64', () => {
        const arrayBuffer = new TextEncoder().encode('hello').buffer
        expect(encodeImageDataAsBase64(arrayBuffer)).toBe(Buffer.from(arrayBuffer).toString('base64'))
    })
})
