export const OPENROUTER_TOOL_CHOICE_REQUEST = {
    NONE: 'none',
    AUTO: 'auto',
    REQUIRED: 'required'
} as const

export type OpenRouterToolChoiceSimpleRequest =
    (typeof OPENROUTER_TOOL_CHOICE_REQUEST)[keyof typeof OPENROUTER_TOOL_CHOICE_REQUEST]

export type OpenRouterToolChoiceFunctionRequest = {
    type: 'function'
    function: {
        name: string
    }
}

export type OpenRouterToolChoiceRequest = OpenRouterToolChoiceSimpleRequest | OpenRouterToolChoiceFunctionRequest
