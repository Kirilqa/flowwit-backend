import { PlanStep } from '../types'

export function flattenLeafSteps(steps: Array<PlanStep>): Array<PlanStep> {
    const result: Array<PlanStep> = []

    for (const step of steps) {
        if (step.steps === undefined || step.steps.length === 0) {
            result.push(step)
        } else {
            result.push(...flattenLeafSteps(step.steps))
        }
    }

    return result
}
