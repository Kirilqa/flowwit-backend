import { planDraftSchema } from '@strategy/implementations/PlanAndExecuteStrategy/validators/planDraftSchema'

describe('planDraftSchema', () => {
    it('parses a flat plan with no nested steps', () => {
        const result = planDraftSchema.safeParse({ steps: [{ description: 'Do X' }, { description: 'Do Y' }] })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        expect(result.data.steps).toEqual([{ description: 'Do X' }, { description: 'Do Y' }])
    })

    it('recursively cleans nested steps', () => {
        const result = planDraftSchema.safeParse({
            steps: [
                {
                    description: 'Parent step',
                    steps: [{ description: 'Child step A' }, { description: 'Child step B' }]
                }
            ]
        })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        expect(result.data.steps).toEqual([
            {
                description: 'Parent step',
                steps: [{ description: 'Child step A' }, { description: 'Child step B' }]
            }
        ])
    })

    it('recursively cleans steps nested more than one level deep', () => {
        const result = planDraftSchema.safeParse({
            steps: [
                {
                    description: 'Root',
                    steps: [{ description: 'Mid', steps: [{ description: 'Leaf' }] }]
                }
            ]
        })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        expect(result.data.steps[0]?.steps?.[0]?.steps).toEqual([{ description: 'Leaf' }])
    })

    it('omits the steps field for a leaf step instead of an empty array', () => {
        const result = planDraftSchema.safeParse({ steps: [{ description: 'Leaf only' }] })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        const leaf = result.data.steps[0]
        expect(leaf).toBeDefined()
        expect(leaf && 'steps' in leaf).toBe(false)
    })

    it('rejects a plan with zero steps', () => {
        const result = planDraftSchema.safeParse({ steps: [] })
        expect(result.success).toBe(false)
    })

    it('rejects a step with an empty description', () => {
        const result = planDraftSchema.safeParse({ steps: [{ description: '' }] })
        expect(result.success).toBe(false)
    })
})
