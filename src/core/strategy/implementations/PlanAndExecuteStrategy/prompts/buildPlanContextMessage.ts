import { Plan } from '../types'
import { formatPlanAsText } from '../utils'

export function buildPlanContextMessage(plan: Plan, isRevision = false): string {
    const intro = isRevision ? 'Here is the revised plan for this task' : 'Here is the full plan for this task'

    return `
${intro}:
${formatPlanAsText(plan)}

Keep this in mind while working through the steps — for example, if an early step's implementation needs to stay consistent with something a later step will require, decide accordingly now rather than only when that later step starts.

From now on, at the start of each step you will be shown only what has been completed so far and the step you are currently working on — not this full list again. That is intentional, so you stay focused on the current step instead of getting pulled toward upcoming work early. Use what you saw here for context, not as a checklist to work through on your own.
`.trim()
}
