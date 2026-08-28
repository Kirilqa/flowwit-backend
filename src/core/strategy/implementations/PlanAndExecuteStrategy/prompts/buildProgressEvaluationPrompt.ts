import { PlanStep } from '../types'

export function buildProgressEvaluationPrompt(window: Array<PlanStep>): string {
    const list = window.map(step => `${step.id}. ${step.description}`).join('\n')

    return `
Based on the conversation above, check progress against these steps, in this exact order, starting from the first:
${list}

Go through them strictly in order. For each one, only count it as completed if there is clear, unambiguous evidence in the conversation that it is fully done. As soon as you reach a step you are not fully certain about, stop there — do not include it or anything after it, even if it looks likely done. It is better to under-report progress than to mark something done that is not actually finished.

Return only JSON matching the required schema:
- "completedSteps" — an ordered list of the steps confirmed done, starting from the first one above, stopping at the first uncertain one. Empty if even the first step is not yet clearly done. Each entry needs the step's id and a short "result" describing what was done.
- "status" — required only if not every step above was included in "completedSteps": "failed" if the first not-included step cannot be completed as stated (include "error"), "incomplete" if it is still in progress and needs another turn (include "missingWork"), or "waiting_for_user" if it is blocked on information or a decision only the user can provide, already asked (ideally via \`human_input\`, but a plain-text question counts too).
`.trim()
}
