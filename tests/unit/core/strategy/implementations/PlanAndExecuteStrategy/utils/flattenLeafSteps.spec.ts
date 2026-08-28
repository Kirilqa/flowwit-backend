import { PLAN_STEP_STATUS, PlanStep } from '@strategy'
import { flattenLeafSteps } from '@strategy/implementations/PlanAndExecuteStrategy/utils/flattenLeafSteps'

function leaf(id: string): PlanStep {
    return { id, description: 'do it', status: PLAN_STEP_STATUS.PENDING }
}

describe('flattenLeafSteps', () => {
    it('returns an empty array for an empty list', () => {
        expect(flattenLeafSteps([])).toEqual([])
    })

    it('returns a flat list of leaves unchanged', () => {
        const steps = [leaf('1'), leaf('2')]
        expect(flattenLeafSteps(steps)).toEqual(steps)
    })

    it('excludes group nodes and returns only their children', () => {
        const group: PlanStep = { ...leaf('1'), steps: [leaf('1.1'), leaf('1.2')] }
        const result = flattenLeafSteps([group])
        expect(result.map(step => step.id)).toEqual(['1.1', '1.2'])
    })

    it('treats a step with an empty steps array as a leaf itself', () => {
        const step: PlanStep = { ...leaf('1'), steps: [] }
        const result = flattenLeafSteps([step])
        expect(result).toEqual([step])
    })

    it('flattens a mix of leaf and group siblings preserving order', () => {
        const group: PlanStep = { ...leaf('2'), steps: [leaf('2.1'), leaf('2.2')] }
        const result = flattenLeafSteps([leaf('1'), group, leaf('3')])
        expect(result.map(step => step.id)).toEqual(['1', '2.1', '2.2', '3'])
    })

    it('flattens nested groups three levels deep', () => {
        const deep: PlanStep = { ...leaf('1'), steps: [{ ...leaf('1.1'), steps: [leaf('1.1.1'), leaf('1.1.2')] }] }
        const result = flattenLeafSteps([deep])
        expect(result.map(step => step.id)).toEqual(['1.1.1', '1.1.2'])
    })
})
