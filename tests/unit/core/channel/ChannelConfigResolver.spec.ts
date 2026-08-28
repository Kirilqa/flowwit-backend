import { ChannelConfigResolver } from '@channel/utils/ChannelConfigResolver'
import { CHANNEL_SETTING_VISIBILITY, CHANNEL_SETTING_TYPE } from '@channel'
import { ChannelConfig } from '@channel/types/ChannelConfig'

type TestSettings = { token: string; enabled: boolean; timeout: number }

const schema = [
    {
        key: 'token' as const,
        label: 'Token',
        type: CHANNEL_SETTING_TYPE.STRING,
        visibility: CHANNEL_SETTING_VISIBILITY.PRIVATE,
        envKey: 'TEST_TOKEN'
    },
    {
        key: 'enabled' as const,
        label: 'Enabled',
        type: CHANNEL_SETTING_TYPE.BOOLEAN,
        visibility: CHANNEL_SETTING_VISIBILITY.PUBLIC,
        envKey: 'TEST_ENABLED'
    },
    {
        key: 'timeout' as const,
        label: 'Timeout',
        type: CHANNEL_SETTING_TYPE.NUMBER,
        visibility: CHANNEL_SETTING_VISIBILITY.PUBLIC,
        envKey: 'TEST_TIMEOUT'
    }
]

describe('ChannelConfigResolver', () => {
    let resolver: ChannelConfigResolver
    const saved: Record<string, string | undefined> = {}

    beforeEach(() => {
        resolver = new ChannelConfigResolver()
        saved['TEST_TOKEN'] = process.env['TEST_TOKEN']
        saved['TEST_ENABLED'] = process.env['TEST_ENABLED']
        saved['TEST_TIMEOUT'] = process.env['TEST_TIMEOUT']
        delete process.env['TEST_TOKEN']
        delete process.env['TEST_ENABLED']
        delete process.env['TEST_TIMEOUT']
    })

    afterEach(() => {
        for (const [k, v] of Object.entries(saved)) {
            if (v === undefined) Reflect.deleteProperty(process.env, k)
            else process.env[k] = v
        }
    })

    it('returns stored settings when no env vars are set', () => {
        const config: ChannelConfig = { channelId: 'web', settings: { token: 'stored-tok' } }
        const result = resolver.resolve<TestSettings>(config, schema)
        expect(result.token).toBe('stored-tok')
    })

    it('returns empty settings when config is null', () => {
        const result = resolver.resolve<TestSettings>(null, schema)
        expect(result.token).toBeUndefined()
    })

    it('overrides string setting with env var', () => {
        process.env['TEST_TOKEN'] = 'env-token'
        const config: ChannelConfig = { channelId: 'web', settings: { token: 'stored' } }
        const result = resolver.resolve<TestSettings>(config, schema)
        expect(result.token).toBe('env-token')
    })

    it('overrides boolean setting with "true" env var', () => {
        process.env['TEST_ENABLED'] = 'true'
        const result = resolver.resolve<TestSettings>(null, schema)
        expect(result.enabled).toBe(true)
    })

    it('overrides boolean setting with "1" env var', () => {
        process.env['TEST_ENABLED'] = '1'
        const result = resolver.resolve<TestSettings>(null, schema)
        expect(result.enabled).toBe(true)
    })

    it('sets boolean to false for values other than "true" or "1"', () => {
        process.env['TEST_ENABLED'] = 'false'
        const result = resolver.resolve<TestSettings>(null, schema)
        expect(result.enabled).toBe(false)
    })

    it('overrides number setting with numeric env var', () => {
        process.env['TEST_TIMEOUT'] = '5000'
        const result = resolver.resolve<TestSettings>(null, schema)
        expect(result.timeout).toBe(5000)
    })

    it('ignores non-numeric env var for number setting', () => {
        process.env['TEST_TIMEOUT'] = 'not-a-number'
        const config: ChannelConfig = { channelId: 'web', settings: { timeout: 3000 } }
        const result = resolver.resolve<TestSettings>(config, schema)
        expect(result.timeout).toBe(3000)
    })

    it('env var takes priority over stored config value', () => {
        process.env['TEST_TOKEN'] = 'from-env'
        const config: ChannelConfig = { channelId: 'web', settings: { token: 'from-config' } }
        const result = resolver.resolve<TestSettings>(config, schema)
        expect(result.token).toBe('from-env')
    })

    it('ignores schema fields without envKey', () => {
        const schemaWithoutEnvKey = [
            {
                key: 'token' as const,
                label: 'Token',
                type: CHANNEL_SETTING_TYPE.STRING,
                visibility: CHANNEL_SETTING_VISIBILITY.PRIVATE
            }
        ]
        const config: ChannelConfig = { channelId: 'web', settings: { token: 'stored' } }
        const result = resolver.resolve<TestSettings>(config, schemaWithoutEnvKey)
        expect(result.token).toBe('stored')
    })
})
