export const MCP_SERVER_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
} as const

export type MCPServerStatus = (typeof MCP_SERVER_STATUS)[keyof typeof MCP_SERVER_STATUS]
