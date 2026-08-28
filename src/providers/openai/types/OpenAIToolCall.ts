export type OpenAIToolCall = {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}
