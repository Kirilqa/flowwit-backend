import { PLAN_STEP_STATUS, Plan, PlanStep } from '@strategy'
import { formatPlanProgressText } from '@strategy/implementations/PlanAndExecuteStrategy/utils/formatPlanProgressText'

function leaf(id: string, description = 'do it'): PlanStep {
    return { id, description, status: PLAN_STEP_STATUS.PENDING }
}

describe('formatPlanProgressText', () => {
    it('includes only steps up to and including the current flat step', () => {
        const plan: Plan = { steps: [leaf('1', 'a'), leaf('2', 'b'), leaf('3', 'c')] }

        const result = formatPlanProgressText(plan, '2')

        expect(result).toContain('1 a')
        expect(result).toContain('2 b')
        expect(result).not.toContain('3 c')
    })

    it('excludes steps that come after the current one', () => {
        const plan: Plan = { steps: [leaf('1'), leaf('2'), leaf('3')] }
        const result = formatPlanProgressText(plan, '1')
        expect(result.split('\n')).toHaveLength(1)
    })

    it('includes the containing group but filters its children down to the current step', () => {
        const plan: Plan = {
            steps: [
                { ...leaf('1', 'group'), steps: [leaf('1.1', 'first'), leaf('1.2', 'current')] },
                leaf('2', 'later')
            ]
        }

        const result = formatPlanProgressText(plan, '1.2')

        expect(result).toContain('1.1 first')
        expect(result).toContain('1.2 current')
        expect(result).not.toContain('2 later')
    })

    it('excludes siblings inside the containing group that come after the current step', () => {
        const plan: Plan = {
            steps: [{ ...leaf('1', 'group'), steps: [leaf('1.1', 'current'), leaf('1.2', 'not yet')] }]
        }

        const result = formatPlanProgressText(plan, '1.1')

        expect(result).toContain('1.1 current')
        expect(result).not.toContain('1.2 not yet')
    })

    it('returns an empty string when the plan has no steps', () => {
        const plan: Plan = { steps: [] }
        expect(formatPlanProgressText(plan, '1')).toBe('')
    })
})
