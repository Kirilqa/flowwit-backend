import { PLAN_STEP_STATUS, Plan, PlanStep } from '@strategy'
import { formatPlanAsText } from '@strategy/implementations/PlanAndExecuteStrategy/utils/formatPlanAsText'

function leaf(id: string, description = 'do it'): PlanStep {
    return { id, description, status: PLAN_STEP_STATUS.PENDING }
}

describe('formatPlanAsText', () => {
    it('returns an empty string for a plan with no steps', () => {
        expect(formatPlanAsText({ steps: [] })).toBe('')
    })

    it('formats a single step', () => {
        const plan: Plan = { steps: [leaf('1', 'Create file')] }
        expect(formatPlanAsText(plan)).toBe('- [pending] 1 Create file')
    })

    it('joins multiple top-level steps with newlines', () => {
        const plan: Plan = { steps: [leaf('1', 'a'), leaf('2', 'b')] }
        expect(formatPlanAsText(plan)).toBe('- [pending] 1 a\n- [pending] 2 b')
    })

    it('renders nested steps indented under their parent', () => {
        const plan: Plan = { steps: [{ ...leaf('1', 'Parent'), steps: [leaf('1.1', 'Child')] }] }
        expect(formatPlanAsText(plan)).toBe('- [pending] 1 Parent\n  - [pending] 1.1 Child')
    })
})
