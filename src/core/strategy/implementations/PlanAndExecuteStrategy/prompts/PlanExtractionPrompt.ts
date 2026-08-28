export const PLAN_EXTRACTION_PROMPT = `
Build a plan to accomplish the task, using "the task" as defined in the "Scope of the current task" section of the system prompt — not automatically everything ever discussed in the conversation.

The plan is a list of steps. A step may optionally contain nested sub-steps, to any depth, but only when it genuinely helps break down distinct, independent pieces of work — do not nest for its own sake.

Scale the number of steps to the actual complexity of the task. A simple task should have very few steps, sometimes just one. Only introduce many steps when the task genuinely has that many distinct, independent pieces of work.

Each leaf step must be a complete, independently verifiable unit of deliverable work — something you could point to afterward and say "this is done" or "this failed" on its own. Do not turn implementation details inside a single piece of work into their own steps.

Good example: one step "Write aggregate.js with parseCsv and aggregateByDepartment functions".
Bad example: separate steps for "split CSV by newlines", "parse header row", "convert salary to number" — these are all implementation details of the same function, not distinct steps.

Return only JSON matching the required schema, with no surrounding commentary.
`.trim()
