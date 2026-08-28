import { MCPServerConfig, MCPServerStatus } from '@mcp'

export type MCPServerSummary = {
    name: string
    config: MCPServerConfig
    status: MCPServerStatus
}
