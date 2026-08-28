import { ChannelConfigUpdater } from '@channel/updaters/ChannelConfigUpdater'
import { ChannelConfig } from '@channel'
import { WATCHER_EVENT_TYPE } from '@core/watcher'
import { makeChannel, makeChannelConfigRepository, makeChannelRegistry } from '../../../helpers/makeChannel'

describe('ChannelConfigUpdater', () => {
    describe('handle()', () => {
        it('calls stop, configure, start on channel for ADD event', async () => {
            const channel = makeChannel('web')
            const repo = makeChannelConfigRepository([{ channelId: 'web', settings: { token: 'abc' } }])
            const updater = new ChannelConfigUpdater(repo, makeChannelRegistry([channel]))

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: 'channels.json' })

            expect(channel.stop).toHaveBeenCalledTimes(1)
            expect(channel.configure).toHaveBeenCalledTimes(1)
            expect(channel.start).toHaveBeenCalledTimes(1)
        })

        it('calls stop, configure, start on channel for CHANGE event', async () => {
            const channel = makeChannel('web')
            const repo = makeChannelConfigRepository()
            const updater = new ChannelConfigUpdater(repo, makeChannelRegistry([channel]))

            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'channels.json' })

            expect(channel.stop).toHaveBeenCalledTimes(1)
            expect(channel.configure).toHaveBeenCalledTimes(1)
            expect(channel.start).toHaveBeenCalledTimes(1)
        })

        it('does nothing for UNLINK event', async () => {
            const channel = makeChannel('web')
            const updater = new ChannelConfigUpdater(makeChannelConfigRepository(), makeChannelRegistry([channel]))

            await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: 'channels.json' })

            expect(channel.stop).not.toHaveBeenCalled()
            expect(channel.configure).not.toHaveBeenCalled()
            expect(channel.start).not.toHaveBeenCalled()
        })

        it('passes resolved settings to channel.configure', async () => {
            const channel = makeChannel('web')
            const config: ChannelConfig = { channelId: 'web', settings: { token: 'secret' } }
            const updater = new ChannelConfigUpdater(
                makeChannelConfigRepository([config]),
                makeChannelRegistry([channel])
            )

            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'channels.json' })

            expect(channel.configure).toHaveBeenCalledWith(expect.objectContaining({ token: 'secret' }))
        })

        it('skips channels whose config fingerprint has not changed', async () => {
            const channel = makeChannel('web')
            const repo = makeChannelConfigRepository()
            const updater = new ChannelConfigUpdater(repo, makeChannelRegistry([channel]))

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: 'channels.json' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'channels.json' })

            expect(channel.stop).toHaveBeenCalledTimes(1)
            expect(channel.configure).toHaveBeenCalledTimes(1)
        })

        it('reconfigures channels when config changes between events', async () => {
            const channel = makeChannel('web')
            const repo = makeChannelConfigRepository()
            ;(repo.findAll as jest.Mock)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ channelId: 'web', settings: { token: 'new-token' } }])

            const updater = new ChannelConfigUpdater(repo, makeChannelRegistry([channel]))

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: 'channels.json' })
            await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'channels.json' })

            expect(channel.configure).toHaveBeenCalledTimes(2)
        })

        it('handles multiple channels independently', async () => {
            const web = makeChannel('web')
            const telegram = makeChannel('telegram')
            const updater = new ChannelConfigUpdater(
                makeChannelConfigRepository(),
                makeChannelRegistry([web, telegram])
            )

            await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: 'channels.json' })

            expect(web.stop).toHaveBeenCalledTimes(1)
            expect(telegram.stop).toHaveBeenCalledTimes(1)
        })
    })
})
