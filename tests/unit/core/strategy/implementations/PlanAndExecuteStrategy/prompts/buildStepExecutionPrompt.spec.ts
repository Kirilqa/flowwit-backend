import { PLAN_STEP_STATUS, Plan, PlanStep } from '@strategy'
import { buildStepExecutionPrompt } from '@strategy/implementations/PlanAndExecuteStrategy/prompts/buildStepExecutionPrompt'

function leaf(id: string, description = 'do it'): PlanStep {
    return { id, description, status: PLAN_STEP_STATUS.PENDING }
}

describe('buildStepExecutionPrompt', () => {
    it('includes the current step id and description', () => {
        const step = leaf('2', 'Write tests')
        const plan: Plan = { steps: [leaf('1'), step] }

        const result = buildStepExecutionPrompt(plan, step)

        expect(result).toContain('step 2: Write tests')
    })

    it('includes the plan progress text up to the current step', () => {
        const step = leaf('2', 'current')
        const plan: Plan = { steps: [leaf('1', 'previous'), step] }

        const result = buildStepExecutionPrompt(plan, step)

        expect(result).toContain('1 previous')
    })

    it('mentions the human_input tool for user-dependent steps', () => {
        const step = leaf('1')
        const plan: Plan = { steps: [step] }

        expect(buildStepExecutionPrompt(plan, step)).toContain('human_input')
    })

    it('does not mention a continuation note when none is given', () => {
        const step = leaf('1')
        const plan: Plan = { steps: [step] }

        expect(buildStepExecutionPrompt(plan, step)).not.toContain('judged incomplete')
    })

    it('appends the continuation note when the step was judged incomplete', () => {
        const step = leaf('1')
        const plan: Plan = { steps: [step] }

        const result = buildStepExecutionPrompt(plan, step, 'still need to write the header row')

        expect(result).toContain('judged incomplete')
        expect(result).toContain('still need to write the header row')
    })
})
