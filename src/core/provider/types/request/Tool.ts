export type Tool = {
    type: 'function'
    function: {
        name: string
        description?: string
        parameters: Record<string, unknown>
        strict?: boolean
    }
}
