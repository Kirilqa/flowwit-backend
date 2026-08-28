import { MCPClientInterface } from '../interfaces'
import { MCPServerStatusDetails } from './MCPServerStatusDetails'

export type MCPConnectionState = {
    client: MCPClientInterface
    statusDetails: MCPServerStatusDetails
    reconnectTimer: ReturnType<typeof setTimeout> | null
    manuallyDisconnected: boolean
    disconnectSubscribed: boolean
}
