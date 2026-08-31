export type LMStudioFunctionRequest = {
    name: string
    description?: string
    parameters: Record<string, unknown>
}
