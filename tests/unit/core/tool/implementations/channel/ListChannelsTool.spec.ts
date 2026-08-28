import { ListChannelsTool } from '@tool/implementations/channel/ListChannelsTool'
import { CHANNEL_SETTING_TYPE, CHANNEL_SETTING_VISIBILITY, ChannelConfig, ChannelInterface } from '@channel'
import { makeChannel, makeChannelConfigRepository, makeChannelRegistry } from '../../../../../helpers/makeChannel'

describe('ListChannelsTool', () => {
    it('has correct name', () => {
        expect(new ListChannelsTool(makeChannelRegistry(), makeChannelConfigRepository()).name).toBe('channel_list')
    })

    it('returns empty array when no channels registered', async () => {
        const tool = new ListChannelsTool(makeChannelRegistry(), makeChannelConfigRepository())
        const result = await tool.execute({}, 'agent-1', 'session-1')
        expect(result).toEqual([])
    })

    it('returns detail for each registered channel', async () => {
        const channels = [makeChannel('web'), makeChannel('telegram')]
        const tool = new ListChannelsTool(makeChannelRegistry(channels), makeChannelConfigRepository())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{ id: string }>
        expect(result).toHaveLength(2)
        expect(result.map(r => r.id)).toEqual(expect.arrayContaining(['web', 'telegram']))
    })

    it('marks private settings with isSet instead of value', async () => {
        const channel = makeChannel('web')
        const config: ChannelConfig = { channelId: 'web', settings: { token: 'secret-token' } }
        const tool = new ListChannelsTool(makeChannelRegistry([channel]), makeChannelConfigRepository([config]))

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            settings: Array<{ key: string; visibility: string; isSet?: boolean; value?: unknown }>
        }>
        const tokenSetting = result[0]?.settings.find(s => s.key === 'token')
        expect(tokenSetting?.visibility).toBe('private')
        expect(tokenSetting?.isSet).toBe(true)
        expect(tokenSetting).not.toHaveProperty('value')
    })

    it('returns value for public settings', async () => {
        const channel = makeChannel('web')
        const config: ChannelConfig = { channelId: 'web', settings: { debug: true } }
        const tool = new ListChannelsTool(makeChannelRegistry([channel]), makeChannelConfigRepository([config]))

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            settings: Array<{ key: string; visibility: string; value?: unknown }>
        }>
        const debugSetting = result[0]?.settings.find(s => s.key === 'debug')
        expect(debugSetting?.visibility).toBe('public')
        expect(debugSetting?.value).toBe(true)
    })

    it('shows isSet=false for private settings that are not configured', async () => {
        const channel = makeChannel('web')
        const tool = new ListChannelsTool(makeChannelRegistry([channel]), makeChannelConfigRepository())

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            settings: Array<{ key: string; isSet?: boolean }>
        }>
        const tokenSetting = result[0]?.settings.find(s => s.key === 'token')
        expect(tokenSetting?.isSet).toBe(false)
    })

    it('shows null value for public settings that are not configured', async () => {
        const channel = makeChannel('web')
        const tool = new ListChannelsTool(makeChannelRegistry([channel]), makeChannelConfigRepository())

        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            settings: Array<{ key: string; value?: unknown }>
        }>
        const debugSetting = result[0]?.settings.find(s => s.key === 'debug')
        expect(debugSetting?.value).toBeNull()
    })

    it('defaults required to false when field has no required property', async () => {
        const channel: ChannelInterface = makeChannel('test', {
            settingsSchema: [
                {
                    key: 'optField',
                    label: 'Optional Field',
                    type: CHANNEL_SETTING_TYPE.STRING,
                    visibility: CHANNEL_SETTING_VISIBILITY.PUBLIC
                }
            ]
        })
        const tool = new ListChannelsTool(makeChannelRegistry([channel]), makeChannelConfigRepository())
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            settings: Array<{ key: string; required: boolean }>
        }>
        const setting = result[0]?.settings.find(s => s.key === 'optField')
        expect(setting?.required).toBe(false)
    })
})
