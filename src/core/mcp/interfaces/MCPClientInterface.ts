import {
    MCPCallToolResult,
    MCPPrompt,
    MCPResource,
    MCPResourceContent,
    MCPServerCapabilities,
    MCPServerConfig,
    MCPServerInfo,
    MCPServerStatus,
    MCPToolDefinition
} from '../types'

export interface MCPClientInterface {
    readonly alias: string

    connect(): Promise<void>
    disconnect(): Promise<void>
    onConnect(callback: () => void): void
    onDisconnect(callback: () => void): void

    getStatus(): MCPServerStatus
    getCapabilities(): MCPServerCapabilities | null
    getConfig(): MCPServerConfig

    getServerInfo(): Promise<MCPServerInfo>

    listTools(): Promise<Array<MCPToolDefinition>>
    callTool(name: string, args: Record<string, unknown>): Promise<MCPCallToolResult>

    listResources(): Promise<Array<MCPResource>>
    readResource(uri: string): Promise<MCPResourceContent>

    listPrompts(): Promise<Array<MCPPrompt>>
    getPrompt(name: string, args?: Record<string, string>): Promise<string>
}
