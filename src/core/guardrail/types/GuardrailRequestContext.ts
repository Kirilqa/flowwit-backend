import { GUARDRAIL_REQUEST_CONTEXT_TYPE } from './GuardrailRequestContextType'

export type GuardrailRequestInputContext = {
    type: typeof GUARDRAIL_REQUEST_CONTEXT_TYPE.INPUT
    input: string
}
export type GuardrailRequestOutputContext = {
    type: typeof GUARDRAIL_REQUEST_CONTEXT_TYPE.OUTPUT
    output: string
}
export type GuardrailRequestToolCallContext = {
    type: typeof GUARDRAIL_REQUEST_CONTEXT_TYPE.TOOL_CALL
    toolCallId: string
}

export type GuardrailRequestContext =
    GuardrailRequestInputContext | GuardrailRequestOutputContext | GuardrailRequestToolCallContext
