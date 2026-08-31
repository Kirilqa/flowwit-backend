export type LMStudioStreamToolCallDeltaResponse = {
    index: number
    id?: string
    type?: 'function'
    function?: {
        name?: string
        arguments?: string
    }
}
