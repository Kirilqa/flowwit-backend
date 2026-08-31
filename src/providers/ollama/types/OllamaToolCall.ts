export type OllamaToolCall = {
    id: string
    index?: number
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}
