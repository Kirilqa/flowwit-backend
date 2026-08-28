import { MCPServerStatusDetails } from '../types'
import { MCPClientInterface } from './MCPClientInterface'

export interface MCPConnectionManagerInterface {
    add(name: string, client: MCPClientInterface): Promise<void>
    remove(name: string): Promise<void>

    connect(name: string): Promise<void>
    disconnect(name: string): Promise<void>
    connectAll(): Promise<void>
    disconnectAll(): Promise<void>

    getClient(name: string): MCPClientInterface | null
    listClients(): Record<string, MCPClientInterface>

    getStatus(name: string): MCPServerStatusDetails | null
    listStatuses(): Record<string, MCPServerStatusDetails>
}
