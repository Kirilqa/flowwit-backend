import { UpdateChannelTool } from '@tool/implementations/channel/UpdateChannelTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { ChannelConfig, ChannelConfigResolver } from '@channel'
import { makeChannel, makeChannelConfigRepository, makeChannelRegistry } from '../../../../../helpers/makeChannel'

function makeResolver(): ChannelConfigResolver {
    return new ChannelConfigResolver()
}

describe('UpdateChannelTool', () => {
    it('has correct name', () => {
        const tool = new UpdateChannelTool(makeChannelRegistry(), makeChannelConfigRepository(), makeResolver())
        expect(tool.name).toBe('channel_update')
    })

    it('throws AgentToolError for unknown channel ID', async () => {
        const tool = new UpdateChannelTool(makeChannelRegistry(), makeChannelConfigRepository(), makeResolver())
        await expect(tool.execute({ channelId: 'missing', settings: {} }, 'agent-1', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError for unknown setting keys', async () => {
        const channel = makeChannel('web')
        const tool = new UpdateChannelTool(
            makeChannelRegistry([channel]),
            makeChannelConfigRepository(),
            makeResolver()
        )
        await expect(
            tool.execute({ channelId: 'web', settings: { unknown_key: 'value' } }, 'agent-1', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('calls channelConfigRepository.create when no existing config', async () => {
        const channel = makeChannel('web')
        const repo = makeChannelConfigRepository()
        const tool = new UpdateChannelTool(makeChannelRegistry([channel]), repo, makeResolver())

        await tool.execute({ channelId: 'web', settings: { debug: true } }, 'agent-1', 'session-1')

        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ channelId: 'web' }))
    })

    it('calls channelConfigRepository.update when config already exists', async () => {
        const channel = makeChannel('web')
        const existingConfig: ChannelConfig = { channelId: 'web', settings: { debug: false } }
        const repo = makeChannelConfigRepository([existingConfig])
        const tool = new UpdateChannelTool(makeChannelRegistry([channel]), repo, makeResolver())

        await tool.execute({ channelId: 'web', settings: { debug: true } }, 'agent-1', 'session-1')

        expect(repo.update).toHaveBeenCalledWith('web', expect.objectContaining({ settings: { debug: true } }))
        expect(repo.create).not.toHaveBeenCalled()
    })

    it('calls channel.configure with resolved settings', async () => {
        const channel = makeChannel('web')
        const repo = makeChannelConfigRepository()
        const tool = new UpdateChannelTool(makeChannelRegistry([channel]), repo, makeResolver())

        await tool.execute({ channelId: 'web', settings: { debug: true } }, 'agent-1', 'session-1')

        expect(channel.configure).toHaveBeenCalledWith(expect.objectContaining({ debug: true }))
    })

    it('returns ChannelDetail after update', async () => {
        const channel = makeChannel('web')
        const tool = new UpdateChannelTool(
            makeChannelRegistry([channel]),
            makeChannelConfigRepository(),
            makeResolver()
        )

        const result = (await tool.execute(
            { channelId: 'web', settings: { debug: false } },
            'agent-1',
            'session-1'
        )) as { id: string }
        expect(result.id).toBe('web')
    })

    it('filters out unknown keys from the error message', async () => {
        const channel = makeChannel('web')
        const tool = new UpdateChannelTool(
            makeChannelRegistry([channel]),
            makeChannelConfigRepository(),
            makeResolver()
        )

        await expect(
            tool.execute({ channelId: 'web', settings: { bad_key: 'x', another_bad: 'y' } }, 'agent-1', 'session-1')
        ).rejects.toThrow(/bad_key/)
    })
})
