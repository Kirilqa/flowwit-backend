import { PLAN_STEP_STATUS, Plan } from '@strategy'
import { buildPlanContextMessage } from '@strategy/implementations/PlanAndExecuteStrategy/prompts/buildPlanContextMessage'

const plan: Plan = { steps: [{ id: '1', description: 'Create employees.csv', status: PLAN_STEP_STATUS.PENDING }] }

describe('buildPlanContextMessage', () => {
    it('describes it as the full plan by default', () => {
        const result = buildPlanContextMessage(plan)
        expect(result).toContain('full plan for this task')
    })

    it('describes it as the revised plan when isRevision is true', () => {
        const result = buildPlanContextMessage(plan, true)
        expect(result).toContain('revised plan for this task')
    })

    it('includes the formatted plan text', () => {
        const result = buildPlanContextMessage(plan)
        expect(result).toContain('Create employees.csv')
    })

    it('explains that only the current step will be shown going forward', () => {
        const result = buildPlanContextMessage(plan)
        expect(result).toContain('From now on')
    })
})
