import {
    ChannelInterface,
    ChannelRegistryInterface,
    ChannelConfigRepositoryInterface,
    ChannelConfig,
    CHANNEL_SETTING_TYPE,
    CHANNEL_SETTING_VISIBILITY
} from '@channel'

export function makeChannel(id: string, overrides: Partial<ChannelInterface> = {}): ChannelInterface {
    return {
        id,
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        onMessage: jest.fn(),
        onStop: jest.fn(),
        configure: jest.fn(),
        settingsSchema: [
            {
                key: 'token',
                label: 'API Token',
                type: CHANNEL_SETTING_TYPE.STRING,
                visibility: CHANNEL_SETTING_VISIBILITY.PRIVATE,
                required: true
            },
            {
                key: 'debug',
                label: 'Debug Mode',
                type: CHANNEL_SETTING_TYPE.BOOLEAN,
                visibility: CHANNEL_SETTING_VISIBILITY.PUBLIC,
                required: false
            }
        ],
        ...overrides
    }
}

export function makeChannelRegistry(channels: Array<ChannelInterface> = []): ChannelRegistryInterface {
    const map = new Map(channels.map(c => [c.id, c]))
    return {
        get: jest.fn((id: string) => map.get(id) ?? null),
        has: jest.fn((id: string) => map.has(id)),
        register: jest.fn((id: string, ch: ChannelInterface) => {
            map.set(id, ch)
        }),
        unregister: jest.fn((id: string) => {
            map.delete(id)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeChannelConfigRepository(configs: Array<ChannelConfig> = []): ChannelConfigRepositoryInterface {
    const map = new Map(configs.map(c => [c.channelId, c]))
    return {
        findAll: jest.fn(() => Promise.resolve([...map.values()])),
        findById: jest.fn((id: string) => Promise.resolve(map.get(id) ?? null)),
        create: jest.fn().mockImplementation((c: ChannelConfig) => {
            map.set(c.channelId, c)
            return Promise.resolve(c)
        }),
        update: jest.fn().mockImplementation((id: string, patch: Partial<ChannelConfig>) => {
            const existing = map.get(id)
            if (existing) {
                const updated = { ...existing, ...patch }
                map.set(id, updated)
                return Promise.resolve(updated)
            }
            return Promise.resolve(patch as ChannelConfig)
        }),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}
