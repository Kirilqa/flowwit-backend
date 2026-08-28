export type OpenAIStreamToolCallDeltaResponse = {
    index: number
    id?: string
    type?: 'function'
    function?: {
        name?: string
        arguments?: string
    }
}
