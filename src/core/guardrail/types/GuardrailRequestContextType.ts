export const GUARDRAIL_REQUEST_CONTEXT_TYPE = {
    INPUT: 'input',
    OUTPUT: 'output',
    TOOL_CALL: 'tool_call'
} as const

export type GuardrailRequestContextType =
    (typeof GUARDRAIL_REQUEST_CONTEXT_TYPE)[keyof typeof GUARDRAIL_REQUEST_CONTEXT_TYPE]
