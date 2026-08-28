import { stableStringify } from '@core/utils'
import { WatcherEventUpdaterInterface, WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { MCPServerRegistryInterface, MCPServerConfigRepositoryInterface } from '../interfaces'
import { MCPClientFactory } from '../types'
import { AgentRegistryInterface } from '@agent/interfaces'

export class MCPConfigUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()

    constructor(
        private readonly mcpClientFactory: MCPClientFactory,
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert()
            return
        }

        this.handleUnlink()
    }

    private async handleUpsert(): Promise<void> {
        const configs = await this.mcpServerConfigRepository.findAll()
        const configNames = new Set(configs.map(config => config.name))
        const changedNames = new Set<string>()

        for (const config of configs) {
            const fingerprint = stableStringify(config)

            if (this.fingerprints.get(config.name) === fingerprint) {
                continue
            }

            if (this.mcpServerRegistry.has(config.name)) {
                this.mcpServerRegistry.unregister(config.name)
            }

            const client = this.mcpClientFactory(config)
            this.mcpServerRegistry.register(config.name, client)
            this.fingerprints.set(config.name, fingerprint)
            changedNames.add(config.name)
        }

        for (const server of this.mcpServerRegistry.list()) {
            if (!configNames.has(server.alias)) {
                this.mcpServerRegistry.unregister(server.alias)
                this.fingerprints.delete(server.alias)
                changedNames.add(server.alias)
            }
        }

        if (changedNames.size === 0) {
            return
        }

        for (const agent of this.agentRegistry.list()) {
            const agentServers = agent.config.mcpServers ?? []

            if (agentServers.length === 0) {
                continue
            }

            if (!agentServers.some(s => changedNames.has(s.alias))) {
                continue
            }

            const updatedServers = agentServers
                .filter(agentServer => configNames.has(agentServer.alias))
                .map(agentServer => this.mcpServerRegistry.get(agentServer.alias) ?? agentServer)

            agent.update({ mcpServers: updatedServers })
        }
    }

    private handleUnlink(): void {
        for (const server of this.mcpServerRegistry.list()) {
            this.mcpServerRegistry.unregister(server.alias)
            this.fingerprints.delete(server.alias)
        }

        for (const agent of this.agentRegistry.list()) {
            if ((agent.config.mcpServers ?? []).length === 0) {
                continue
            }

            agent.update({ mcpServers: [] })
        }
    }
}
