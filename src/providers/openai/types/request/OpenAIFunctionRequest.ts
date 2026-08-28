export type OpenAIFunctionRequest = {
    name: string
    description?: string
    parameters: Record<string, unknown>
    strict?: boolean
}
