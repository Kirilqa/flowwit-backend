export type OpenRouterToolCall = {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}
