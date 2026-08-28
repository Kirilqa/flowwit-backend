export const OPENAI_TOOL_CHOICE_REQUEST = {
    NONE: 'none',
    AUTO: 'auto',
    REQUIRED: 'required'
} as const

export type OpenAIToolChoiceSimpleRequest = (typeof OPENAI_TOOL_CHOICE_REQUEST)[keyof typeof OPENAI_TOOL_CHOICE_REQUEST]

export type OpenAIToolChoiceFunctionRequest = {
    type: 'function'
    function: {
        name: string
    }
}

export type OpenAIToolChoiceRequest = OpenAIToolChoiceSimpleRequest | OpenAIToolChoiceFunctionRequest
