import { buildWorkingDirectoryPrompt } from '@agent/prompts/buildWorkingDirectoryPrompt'

describe('buildWorkingDirectoryPrompt', () => {
    it('starts with the Working directory header', () => {
        const result = buildWorkingDirectoryPrompt('/tmp')
        expect(result.startsWith('# Working directory')).toBe(true)
    })

    it('includes the directory path in the output', () => {
        const result = buildWorkingDirectoryPrompt('/home/user/project')
        expect(result).toContain('/home/user/project')
    })

    it('interpolates the directory multiple times', () => {
        const dir = '/my/workspace'
        const result = buildWorkingDirectoryPrompt(dir)
        const occurrences = result.split(dir).length - 1
        expect(occurrences).toBeGreaterThan(1)
    })

    it('mentions path resolution rules', () => {
        const result = buildWorkingDirectoryPrompt('/workspace')
        expect(result).toContain('Relative paths')
        expect(result).toContain('Absolute paths')
    })

    it('returns a non-empty trimmed string', () => {
        const result = buildWorkingDirectoryPrompt('/dir')
        expect(result.trim()).toBe(result)
        expect(result.length).toBeGreaterThan(0)
    })

    it('produces different outputs for different directories', () => {
        const a = buildWorkingDirectoryPrompt('/dir-a')
        const b = buildWorkingDirectoryPrompt('/dir-b')
        expect(a).not.toBe(b)
    })
})
