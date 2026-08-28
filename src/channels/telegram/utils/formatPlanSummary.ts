import { Plan } from '@strategy'

export function formatPlanSummary(plan: Plan): string {
    const steps = plan.steps.map((step, index) => `${index + 1}. ${step.description}`).join('\n')

    return `📋 План (${plan.steps.length} шагов):\n${steps}`
}
