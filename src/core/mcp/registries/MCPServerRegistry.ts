import { BaseRegistry } from '@core/bases'
import { MCPClientInterface, MCPConnectionManagerInterface, MCPServerRegistryInterface } from '../interfaces'

export class MCPServerRegistry extends BaseRegistry<MCPClientInterface> implements MCPServerRegistryInterface {
    constructor(private readonly connectionManager: MCPConnectionManagerInterface) {
        super()
    }

    override register(alias: string, client: MCPClientInterface): void {
        super.register(alias, client)
        this.connectionManager.add(alias, client).catch(() => {})
    }

    override unregister(alias: string): void {
        super.unregister(alias)
        this.connectionManager.remove(alias).catch(() => {})
    }
}
