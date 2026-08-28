import { MCPServerStatus } from './MCPServerStatus'

export type MCPServerStatusDetails = {
    status: MCPServerStatus
    error?: string
    connectedAt?: number
    lastAttemptAt?: number
    reconnectAttempts?: number
}
