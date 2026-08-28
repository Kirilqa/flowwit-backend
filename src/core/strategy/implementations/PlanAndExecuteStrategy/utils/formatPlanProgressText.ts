import { Plan, PlanStep } from '../types'
import { formatStep } from './formatStep'
import { stepContainsId } from './stepContainsId'

function filterStepsUpToCurrent(steps: Array<PlanStep>, currentStepId: string): Array<PlanStep> {
    const result: Array<PlanStep> = []

    for (const step of steps) {
        if (!stepContainsId(step, currentStepId)) {
            result.push(step)
            continue
        }

        if (step.steps === undefined) {
            result.push(step)
        } else {
            result.push({ ...step, steps: filterStepsUpToCurrent(step.steps, currentStepId) })
        }

        break
    }

    return result
}

export function formatPlanProgressText(plan: Plan, currentStepId: string): string {
    const filtered = filterStepsUpToCurrent(plan.steps, currentStepId)
    return filtered.map(step => formatStep(step, 0)).join('\n')
}
