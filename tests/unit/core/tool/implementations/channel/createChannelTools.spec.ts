import { createChannelTools } from '@tool/implementations/channel/utils/createChannelTools'
import { ChannelConfigResolver } from '@channel/utils/ChannelConfigResolver'
import { makeChannelConfigRepository, makeChannelRegistry } from '../../../../../helpers/makeChannel'

describe('createChannelTools', () => {
    it('returns an array of tool instances', () => {
        const tools = createChannelTools({
            channelRegistry: makeChannelRegistry(),
            channelConfigRepository: makeChannelConfigRepository(),
            channelConfigResolver: new ChannelConfigResolver()
        })
        expect(Array.isArray(tools)).toBe(true)
        expect(tools.length).toBeGreaterThan(0)
    })

    it('includes channel_list, channel_info and channel_update tools', () => {
        const tools = createChannelTools({
            channelRegistry: makeChannelRegistry(),
            channelConfigRepository: makeChannelConfigRepository(),
            channelConfigResolver: new ChannelConfigResolver()
        })
        const names = tools.map(t => t.name)
        expect(names).toContain('channel_list')
        expect(names).toContain('channel_info')
        expect(names).toContain('channel_update')
    })
})
