export type LMStudioToolCall = {
    id: string
    index?: number
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}
