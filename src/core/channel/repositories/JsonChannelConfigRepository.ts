import { readFile, writeFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { ChannelConfigRepositoryInterface } from '../interfaces/repositories/ChannelConfigRepositoryInterface'
import { ChannelConfig } from '../types/ChannelConfig'

export class JsonChannelConfigRepository implements ChannelConfigRepositoryInterface {
    constructor(private readonly filePath: string) {}

    async ensureInitialized(): Promise<void> {
        await ensureJsonFileExists(this.filePath, {})
    }

    async findAll(): Promise<Array<ChannelConfig>> {
        const store = await this.load()
        return Array.from(store, ([channelId, settings]) => ({ channelId, settings }))
    }

    async findById(channelId: string): Promise<ChannelConfig | null> {
        const store = await this.load()
        const settings = store.get(channelId)
        if (settings === undefined) return null
        return { channelId, settings }
    }

    async create(config: ChannelConfig): Promise<ChannelConfig> {
        const store = await this.load()
        store.set(config.channelId, config.settings)
        await this.persist(store)
        return config
    }

    async update(channelId: string, patch: Partial<ChannelConfig>): Promise<ChannelConfig> {
        const existing = await this.findById(channelId)

        if (existing === null) {
            throw new Error(`Channel config "${channelId}" not found`)
        }

        const updated: ChannelConfig = {
            channelId,
            settings: { ...existing.settings, ...(patch.settings ?? {}) }
        }

        return this.create(updated)
    }

    async delete(channelId: string): Promise<void> {
        const store = await this.load()
        store.delete(channelId)
        await this.persist(store)
    }

    private async load(): Promise<Map<string, ChannelConfig['settings']>> {
        let raw: string

        try {
            raw = await readFile(this.filePath, 'utf-8')
        } catch {
            return new Map()
        }

        try {
            return new Map(Object.entries(JSON.parse(raw) as Record<string, ChannelConfig['settings']>))
        } catch {
            throw new Error(`[JsonChannelConfigRepository] Failed to parse JSON file: ${this.filePath}`)
        }
    }

    private async persist(store: Map<string, ChannelConfig['settings']>): Promise<void> {
        await writeFile(this.filePath, JSON.stringify(Object.fromEntries(store), null, 4), 'utf-8')
    }
}
