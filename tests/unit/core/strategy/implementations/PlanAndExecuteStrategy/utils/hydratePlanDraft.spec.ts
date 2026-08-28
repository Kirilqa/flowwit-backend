import { PLAN_STEP_STATUS } from '@strategy'
import { hydratePlanDraft } from '@strategy/implementations/PlanAndExecuteStrategy/utils/hydratePlanDraft'

describe('hydratePlanDraft', () => {
    it('assigns sequential 1-based ids at the top level', () => {
        const result = hydratePlanDraft([{ description: 'a' }, { description: 'b' }])
        expect(result.map(step => step.id)).toEqual(['1', '2'])
    })

    it('sets every hydrated step to PENDING status', () => {
        const result = hydratePlanDraft([{ description: 'a' }])
        expect(result[0]?.status).toBe(PLAN_STEP_STATUS.PENDING)
    })

    it('carries the description through unchanged', () => {
        const result = hydratePlanDraft([{ description: 'Create employees.csv' }])
        expect(result[0]?.description).toBe('Create employees.csv')
    })

    it('offsets ids by startIndex', () => {
        const result = hydratePlanDraft([{ description: 'a' }, { description: 'b' }], 5)
        expect(result.map(step => step.id)).toEqual(['6', '7'])
    })

    it('does not include a steps field when the draft has no children', () => {
        const [step] = hydratePlanDraft([{ description: 'a' }])
        expect(Object.keys(step ?? {}).sort()).toEqual(['description', 'id', 'status'])
    })

    it('does not include a steps field when the draft has an empty steps array', () => {
        const [step] = hydratePlanDraft([{ description: 'a', steps: [] }])
        expect(Object.keys(step ?? {}).sort()).toEqual(['description', 'id', 'status'])
    })

    it('builds dot-path ids for nested children', () => {
        const result = hydratePlanDraft([
            { description: 'parent', steps: [{ description: 'child a' }, { description: 'child b' }] }
        ])
        expect(result[0]?.steps?.map(step => step.id)).toEqual(['1.1', '1.2'])
    })

    it('builds dot-path ids three levels deep', () => {
        const result = hydratePlanDraft([
            { description: 'root', steps: [{ description: 'mid', steps: [{ description: 'leaf' }] }] }
        ])
        expect(result[0]?.steps?.[0]?.steps?.[0]?.id).toBe('1.1.1')
    })

    it('does not apply the parent startIndex offset to nested children', () => {
        const result = hydratePlanDraft([{ description: 'parent', steps: [{ description: 'child' }] }], 5)
        expect(result[0]?.id).toBe('6')
        expect(result[0]?.steps?.[0]?.id).toBe('6.1')
    })
})
