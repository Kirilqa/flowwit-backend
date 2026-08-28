import { isValidTimeZone } from '@core/utils'

describe('isValidTimeZone', () => {
    it('returns true for a well-known IANA time zone', () => {
        expect(isValidTimeZone('Europe/Moscow')).toBe(true)
    })

    it('returns true for UTC', () => {
        expect(isValidTimeZone('UTC')).toBe(true)
    })

    it('returns false for a made-up time zone', () => {
        expect(isValidTimeZone('Not/A_Zone')).toBe(false)
    })

    it('returns false for an empty string', () => {
        expect(isValidTimeZone('')).toBe(false)
    })
})
