export const PREPARATION_GATE_PROMPT = `
Classify what just happened during preparation, using "the task" as defined in the "Scope of the current task" section of the system prompt — not automatically the entire conversation history. Return only JSON matching the required schema:
- "direct_response" — the request did not need a plan at all (casual conversation, a question already answered directly, a greeting, thanks, etc.), or the reply above already fully satisfies the current task as scoped.
- "waiting_for_user" — a clarifying question was asked above and the task cannot proceed without the user's answer.
- "proceed_to_plan" — enough context is available and the (correctly scoped) task is ready to be broken down into a plan.
`.trim()
