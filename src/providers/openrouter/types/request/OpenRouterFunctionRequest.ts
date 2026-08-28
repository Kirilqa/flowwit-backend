export type OpenRouterFunctionRequest = {
    name: string
    description?: string
    parameters: Record<string, unknown>
    strict?: boolean
}
