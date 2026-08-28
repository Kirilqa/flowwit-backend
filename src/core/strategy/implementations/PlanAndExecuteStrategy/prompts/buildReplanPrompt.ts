export function buildReplanPrompt(
    remainingDescriptions: Array<string>,
    failedDescription: string,
    failureReason: string
): string {
    const remainingList = remainingDescriptions.map(description => `- ${description}`).join('\n')

    return `
The step "${failedDescription}" could not be completed for the following reason: ${failureReason}
Everything before this step is already done and cannot be changed. The remaining part of the plan, which needs to be revised, was:
${remainingList}

Build a corrected plan for this remaining work, taking the failure above into account. It replaces the remaining steps listed above entirely — do not repeat already completed work.

The plan is a list of steps, each optionally containing nested sub-steps to any depth, but only when it genuinely helps break down distinct, independent pieces of work — do not nest for its own sake. Scale the number of steps to the actual complexity of the remaining work — do not over-decompose. Each leaf step must be a complete, independently verifiable unit of deliverable work, not an implementation detail inside a single piece of work.

Return only JSON matching the required schema, with no surrounding commentary.
`.trim()
}
