export type OllamaStreamToolCallDeltaResponse = {
    index: number
    id?: string
    type?: 'function'
    function?: {
        name?: string
        arguments?: string
    }
}
