export type MCPToolDefinition = {
    name: string
    description?: string
    inputSchema: Record<string, unknown>
    outputSchema?: Record<string, unknown>
}
