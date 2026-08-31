export type OllamaFunctionRequest = {
    name: string
    description?: string
    parameters: Record<string, unknown>
}
