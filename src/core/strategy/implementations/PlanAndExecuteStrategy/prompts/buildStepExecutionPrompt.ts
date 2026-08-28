import { Plan, PlanStep } from '../types'
import { formatPlanProgressText } from '../utils'

export function buildStepExecutionPrompt(plan: Plan, step: PlanStep, continuationNote?: string): string {
    const progressText = formatPlanProgressText(plan, step.id)

    const base = `
Progress so far, plus your current step:
${progressText}

You are now working on step ${step.id}: ${step.description}
Work only on this step — do not perform work belonging to other steps, even ones you remember from the full plan shown earlier. Use tools as needed.
If you need information only the user can provide to continue this step, call the \`human_input\` tool — do not just respond in plain text and stop, since that will not pause execution cleanly.
`.trim()

    if (continuationNote === undefined) {
        return base
    }

    return `${base}\n\nThis step was judged incomplete. What is still missing: ${continuationNote}\nContinue working on the same step to address this.`
}
