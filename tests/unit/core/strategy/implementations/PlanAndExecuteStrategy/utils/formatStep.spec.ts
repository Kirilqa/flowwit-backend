import { PLAN_STEP_STATUS, PlanStep, PlanStepStatus } from '@strategy'
import { formatStep } from '@strategy/implementations/PlanAndExecuteStrategy/utils/formatStep'

function leaf(id: string, description = 'do it', status: PlanStepStatus = PLAN_STEP_STATUS.PENDING): PlanStep {
    return { id, description, status }
}

describe('formatStep', () => {
    it('formats a leaf step with no indent at depth 0', () => {
        expect(formatStep(leaf('1', 'Create file'), 0)).toBe('- [pending] 1 Create file')
    })

    it('includes the step status in the line', () => {
        expect(formatStep(leaf('1', 'Create file', PLAN_STEP_STATUS.COMPLETED), 0)).toBe('- [completed] 1 Create file')
    })

    it('indents by 2 spaces per depth level', () => {
        expect(formatStep(leaf('1.1'), 1)).toBe('  - [pending] 1.1 do it')
        expect(formatStep(leaf('1.1.1'), 2)).toBe('    - [pending] 1.1.1 do it')
    })

    it('recursively formats child steps on their own indented lines', () => {
        const step: PlanStep = { ...leaf('1', 'Parent'), steps: [leaf('1.1', 'Child A'), leaf('1.2', 'Child B')] }

        expect(formatStep(step, 0)).toBe(
            ['- [pending] 1 Parent', '  - [pending] 1.1 Child A', '  - [pending] 1.2 Child B'].join('\n')
        )
    })

    it('treats an empty steps array the same as having no children in output', () => {
        const step: PlanStep = { ...leaf('1', 'Parent'), steps: [] }
        expect(formatStep(step, 0)).toBe('- [pending] 1 Parent')
    })

    it('formats three levels of nesting with cascading indentation', () => {
        const step: PlanStep = {
            ...leaf('1', 'Root'),
            steps: [{ ...leaf('1.1', 'Mid'), steps: [leaf('1.1.1', 'Leaf')] }]
        }

        expect(formatStep(step, 0)).toBe(
            ['- [pending] 1 Root', '  - [pending] 1.1 Mid', '    - [pending] 1.1.1 Leaf'].join('\n')
        )
    })
})
