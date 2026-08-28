import { buildDateTimePrompt } from '@agent/prompts/buildDateTimePrompt'

describe('buildDateTimePrompt', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2024-01-01T23:00:00Z'))
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('starts with the Current date and time header', () => {
        const result = buildDateTimePrompt()
        expect(result.startsWith('# Current date and time')).toBe(true)
    })

    it('always includes a labeled server time line', () => {
        const result = buildDateTimePrompt()
        expect(result).toMatch(/Server time: \w+, \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(.+\)/)
    })

    it('omits the user time line and explains it is not configured when no time zone is given', () => {
        const result = buildDateTimePrompt()
        expect(result).not.toContain('User time:')
        expect(result).toContain('not configured')
    })

    it('includes a labeled user time line computed in the given time zone', () => {
        const result = buildDateTimePrompt('Asia/Tokyo')
        expect(result).toContain('User time: Tuesday, 2024-01-02 08:00 (Asia/Tokyo)')
    })

    it('can report a different weekday and date than the server across a day boundary', () => {
        const result = buildDateTimePrompt('America/Los_Angeles')
        expect(result).toContain('User time: Monday, 2024-01-01 15:00 (America/Los_Angeles)')
    })

    it('instructs the agent to never calculate or guess the current date/time itself', () => {
        const result = buildDateTimePrompt('Europe/Moscow')
        expect(result).toContain('never calculate or guess the current date/time yourself')
    })

    it('returns a trimmed string', () => {
        const result = buildDateTimePrompt('Europe/Moscow')
        expect(result.trim()).toBe(result)
    })
})
