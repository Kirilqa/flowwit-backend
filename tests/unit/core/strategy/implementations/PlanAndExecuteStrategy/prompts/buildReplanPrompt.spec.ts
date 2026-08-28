import { buildReplanPrompt } from '@strategy/implementations/PlanAndExecuteStrategy/prompts/buildReplanPrompt'

describe('buildReplanPrompt', () => {
    it('includes the failed step description', () => {
        const result = buildReplanPrompt([], 'Deploy to prod', 'reason')
        expect(result).toContain('Deploy to prod')
    })

    it('includes the failure reason', () => {
        const result = buildReplanPrompt([], 'Deploy to prod', 'Tests failed after 3 attempts')
        expect(result).toContain('Tests failed after 3 attempts')
    })

    it('lists remaining descriptions as a bulleted list', () => {
        const result = buildReplanPrompt(['Write docs', 'Ship release'], 'Deploy', 'reason')
        expect(result).toContain('- Write docs')
        expect(result).toContain('- Ship release')
    })

    it('does not throw for an empty remaining list', () => {
        expect(() => buildReplanPrompt([], 'Deploy', 'reason')).not.toThrow()
    })

    it('instructs to return only JSON with no commentary', () => {
        const result = buildReplanPrompt([], 'Deploy', 'reason')
        expect(result).toContain('Return only JSON')
    })
})
