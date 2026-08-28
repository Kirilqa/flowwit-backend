import { Plan } from '../types'
import { formatStep } from './formatStep'

export function formatPlanAsText(plan: Plan): string {
    return plan.steps.map(step => formatStep(step, 0)).join('\n')
}
