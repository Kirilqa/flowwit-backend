import { stableStringify } from '@core/utils'
import { WatcherEventUpdaterInterface, WatcherEvent, WATCHER_EVENT_TYPE } from '@core/watcher'
import { ChannelRegistryInterface } from '../interfaces/registries/ChannelRegistryInterface'
import { ChannelConfigRepositoryInterface } from '../interfaces/repositories/ChannelConfigRepositoryInterface'
import { ChannelConfigResolver } from '../utils/ChannelConfigResolver'

export class ChannelConfigUpdater implements WatcherEventUpdaterInterface {
    private readonly fingerprints = new Map<string, string>()
    private readonly resolver = new ChannelConfigResolver()

    constructor(
        private readonly channelConfigRepository: ChannelConfigRepositoryInterface,
        private readonly channelRegistry: ChannelRegistryInterface
    ) {}

    async handle(event: WatcherEvent): Promise<void> {
        if (event.type === WATCHER_EVENT_TYPE.ADD || event.type === WATCHER_EVENT_TYPE.CHANGE) {
            await this.handleUpsert()
        }
    }

    private async handleUpsert(): Promise<void> {
        const configs = await this.channelConfigRepository.findAll()
        const configMap = new Map(configs.map(c => [c.channelId, c]))

        for (const channel of this.channelRegistry.list()) {
            const config = configMap.get(channel.id) ?? null
            const schema = channel.settingsSchema
            const resolved = this.resolver.resolve(config, schema)
            const fingerprint = stableStringify(resolved)

            if (this.fingerprints.get(channel.id) === fingerprint) {
                continue
            }

            this.fingerprints.set(channel.id, fingerprint)
            await channel.stop()
            channel.configure(resolved)
            await channel.start()
        }
    }
}
