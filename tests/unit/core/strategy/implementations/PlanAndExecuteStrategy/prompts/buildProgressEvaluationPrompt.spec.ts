import { PLAN_STEP_STATUS, PlanStep } from '@strategy'
import { buildProgressEvaluationPrompt } from '@strategy/implementations/PlanAndExecuteStrategy/prompts/buildProgressEvaluationPrompt'

function leaf(id: string, description: string): PlanStep {
    return { id, description, status: PLAN_STEP_STATUS.PENDING }
}

describe('buildProgressEvaluationPrompt', () => {
    it('lists each step as "id. description"', () => {
        const result = buildProgressEvaluationPrompt([leaf('1', 'Create file'), leaf('2', 'Write tests')])
        expect(result).toContain('1. Create file')
        expect(result).toContain('2. Write tests')
    })

    it('preserves the given step order', () => {
        const result = buildProgressEvaluationPrompt([leaf('1', 'first'), leaf('2', 'second')])
        expect(result.indexOf('1. first')).toBeLessThan(result.indexOf('2. second'))
    })

    it('does not throw for an empty window', () => {
        expect(() => buildProgressEvaluationPrompt([])).not.toThrow()
    })

    it('describes the completedSteps and status schema fields', () => {
        const result = buildProgressEvaluationPrompt([leaf('1', 'a')])
        expect(result).toContain('completedSteps')
        expect(result).toContain('status')
    })
})
