import { InfoChannelTool } from '@tool/implementations/channel/InfoChannelTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { ChannelConfig } from '@channel'
import { makeChannel, makeChannelConfigRepository, makeChannelRegistry } from '../../../../../helpers/makeChannel'

describe('InfoChannelTool', () => {
    it('has correct name', () => {
        expect(new InfoChannelTool(makeChannelRegistry(), makeChannelConfigRepository()).name).toBe('channel_info')
    })

    it('returns detail for existing channel', async () => {
        const channel = makeChannel('telegram')
        const tool = new InfoChannelTool(makeChannelRegistry([channel]), makeChannelConfigRepository())
        const result = (await tool.execute({ channelId: 'telegram' }, 'agent-1', 'session-1')) as { id: string }
        expect(result.id).toBe('telegram')
    })

    it('includes settings from config when channel has stored settings', async () => {
        const channel = makeChannel('telegram')
        const config: ChannelConfig = { channelId: 'telegram', settings: { token: 'bot-token' } }
        const tool = new InfoChannelTool(makeChannelRegistry([channel]), makeChannelConfigRepository([config]))

        const result = (await tool.execute({ channelId: 'telegram' }, 'agent-1', 'session-1')) as {
            settings: Array<{ key: string; isSet?: boolean }>
        }
        const tokenSetting = result.settings.find(s => s.key === 'token')
        expect(tokenSetting?.isSet).toBe(true)
    })

    it('throws AgentToolError for unknown channel ID', async () => {
        const tool = new InfoChannelTool(makeChannelRegistry(), makeChannelConfigRepository())
        await expect(tool.execute({ channelId: 'missing' }, 'agent-1', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
