export type MCPStdioServerConfig = {
    name: string
    type: 'stdio'
    command: string
    args?: Array<string>
    env?: Record<string, string>
}

export type MCPHttpServerConfig = {
    name: string
    type: 'streamable-http' | 'sse'
    url: string
    headers?: Record<string, string>
}

export type MCPServerConfig = MCPStdioServerConfig | MCPHttpServerConfig
