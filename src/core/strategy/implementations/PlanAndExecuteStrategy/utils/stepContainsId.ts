import { PlanStep } from '../types'

export function stepContainsId(step: PlanStep, id: string): boolean {
    if (step.id === id) return true
    if (step.steps === undefined) return false
    return step.steps.some(child => stepContainsId(child, id))
}
