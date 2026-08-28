import { PLAN_STEP_STATUS, PlanStep } from '@strategy'
import { stepContainsId } from '@strategy/implementations/PlanAndExecuteStrategy/utils/stepContainsId'

function leaf(id: string): PlanStep {
    return { id, description: 'do it', status: PLAN_STEP_STATUS.PENDING }
}

describe('stepContainsId', () => {
    it('returns true when the step itself matches the id', () => {
        expect(stepContainsId(leaf('1'), '1')).toBe(true)
    })

    it('returns false for a leaf step with a different id', () => {
        expect(stepContainsId(leaf('1'), '2')).toBe(false)
    })

    it('returns true when a direct child matches the id', () => {
        const step: PlanStep = { ...leaf('1'), steps: [leaf('1.1'), leaf('1.2')] }
        expect(stepContainsId(step, '1.2')).toBe(true)
    })

    it('returns false when no child matches the id', () => {
        const step: PlanStep = { ...leaf('1'), steps: [leaf('1.1'), leaf('1.2')] }
        expect(stepContainsId(step, '1.3')).toBe(false)
    })

    it('returns true for a match nested three levels deep', () => {
        const step: PlanStep = {
            ...leaf('1'),
            steps: [{ ...leaf('1.1'), steps: [leaf('1.1.1'), leaf('1.1.2')] }]
        }
        expect(stepContainsId(step, '1.1.2')).toBe(true)
    })

    it('returns false when steps is an empty array and id does not match self', () => {
        const step: PlanStep = { ...leaf('1'), steps: [] }
        expect(stepContainsId(step, '2')).toBe(false)
    })
})
