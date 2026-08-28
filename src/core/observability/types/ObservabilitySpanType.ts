export const OBSERVABILITY_SPAN_TYPE = {
    PREPARATION: 'preparation',
    SESSION_OPTIMIZATION: 'session-optimization',
    TOOLS_BUILD: 'tools-build',
    RUN: 'run',
    ITERATION: 'iteration',
    TOOL_CALL: 'tool-call',
    GUARDRAIL_INPUT: 'guardrail-input',
    GUARDRAIL_TOOL: 'guardrail-tool',
    GUARDRAIL_OUTPUT: 'guardrail-output'
} as const

export type ObservabilitySpanType = (typeof OBSERVABILITY_SPAN_TYPE)[keyof typeof OBSERVABILITY_SPAN_TYPE]
