import { getErrorMessage, stableStringify } from '@core/utils'
import { WatcherEventUpdaterInterface, WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { LoggerInterface } from '@logger'
import { RawAgentConfigRepositoryInterface, AgentRegistryInterface } from '../interfaces'
import { RawAgentFactory } from '../types'

export class AgentConfigUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()

    constructor(
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly rawAgentFactory: RawAgentFactory,
        private readonly logger: LoggerInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert()
            return
        }

        this.handleUnlink()
    }

    private async handleUpsert(): Promise<void> {
        const rawConfigs = await this.agentConfigRepository.findAll()
        const configIds = new Set(rawConfigs.map(raw => raw.id))

        for (const rawConfig of rawConfigs) {
            const fingerprint = stableStringify(rawConfig)

            if (this.fingerprints.get(rawConfig.id) === fingerprint) {
                continue
            }

            try {
                const agent = this.rawAgentFactory(rawConfig)
                const existing = this.agentRegistry.get(rawConfig.id)

                if (existing !== null) {
                    existing.update(agent.config)
                } else {
                    this.agentRegistry.register(rawConfig.id, agent)
                }

                this.fingerprints.set(rawConfig.id, fingerprint)
            } catch (error) {
                this.logger.warn(`Failed to hydrate agent "${rawConfig.name}"`, { error: getErrorMessage(error) })
            }
        }

        const removedIds = new Set<string>()

        for (const agent of this.agentRegistry.list()) {
            if (!configIds.has(agent.config.id)) {
                this.agentRegistry.unregister(agent.config.id)
                this.fingerprints.delete(agent.config.id)
                removedIds.add(agent.config.id)
            }
        }

        if (removedIds.size === 0) {
            return
        }

        for (const agent of this.agentRegistry.list()) {
            const subAgents = agent.config.agents ?? []

            if (!subAgents.some(subAgent => removedIds.has(subAgent.config.id))) {
                continue
            }

            agent.update({ agents: subAgents.filter(subAgent => !removedIds.has(subAgent.config.id)) })
        }
    }

    private handleUnlink(): void {
        for (const agent of this.agentRegistry.list()) {
            this.agentRegistry.unregister(agent.config.id)
            this.fingerprints.delete(agent.config.id)
        }
    }
}
