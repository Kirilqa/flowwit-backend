import { AgentConfigUpdater } from '@agent/updaters/AgentConfigUpdater'
import { WATCHER_EVENT_TYPE } from '@core/watcher'
import { RawAgentFactory } from '@agent/types/RawAgentFactory'
import {
    makeAgentInterface,
    makeAgentRegistry,
    makeRawAgentConfig as makeRawConfig,
    makeRawAgentConfigRepository
} from '../../../../helpers/makeAgent'
import { NoopLogger } from '@logger'

describe('AgentConfigUpdater', () => {
    it('registers a new agent that appears in the config', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('a1')])
        const registry = makeAgentRegistry()
        const newAgent = makeAgentInterface({ id: 'a1' })
        const factory: RawAgentFactory = () => newAgent

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(registry.register).toHaveBeenCalledWith('a1', newAgent)
    })

    it('updates an existing agent in place instead of replacing it', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('a1', { name: 'Renamed' })])
        const existingAgent = makeAgentInterface({ id: 'a1' })
        const registry = makeAgentRegistry([existingAgent])
        const factory: RawAgentFactory = raw => makeAgentInterface({ id: raw.id, name: raw.name })

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(existingAgent.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed' }))
        expect(registry.register).not.toHaveBeenCalled()
    })

    it('unregisters an agent whose config disappeared', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([])
        const existingAgent = makeAgentInterface({ id: 'a1' })
        const registry = makeAgentRegistry([existingAgent])
        const factory: RawAgentFactory = jest.fn()

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(registry.unregister).toHaveBeenCalledWith('a1')
    })

    it('removes a deleted agent from other agents’ sub-agent lists', async () => {
        const repo = makeRawAgentConfigRepository()

        const subAgent = makeAgentInterface({ id: 'sub-1' })
        const parent = makeAgentInterface({ id: 'parent', agents: [subAgent] })

        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('parent')])

        const registry = makeAgentRegistry([parent, subAgent])
        const factory: RawAgentFactory = raw => makeAgentInterface({ id: raw.id })

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(registry.unregister).toHaveBeenCalledWith('sub-1')
        expect(parent.update).toHaveBeenCalledWith({ agents: [] })
    })

    it('does not touch sub-agent lists that do not reference a removed agent', async () => {
        const repo = makeRawAgentConfigRepository()

        const subAgent = makeAgentInterface({ id: 'sub-1' })
        const parent = makeAgentInterface({ id: 'parent', agents: [subAgent] })

        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('parent'), makeRawConfig('sub-1')])

        const registry = makeAgentRegistry([parent, subAgent])
        const factory: RawAgentFactory = raw => {
            const agent = registry.get(raw.id)
            if (!agent) throw new Error(`Agent "${raw.id}" not found in registry`)
            return agent
        }

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(parent.update).not.toHaveBeenCalledWith({ agents: [] })
    })

    it('unregisters every agent when the config file is deleted', async () => {
        const repo = makeRawAgentConfigRepository()
        const agentA = makeAgentInterface({ id: 'a1' })
        const agentB = makeAgentInterface({ id: 'a2' })
        const registry = makeAgentRegistry([agentA, agentB])
        const factory: RawAgentFactory = jest.fn()

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.UNLINK, path: 'agents.json' })

        expect(registry.unregister).toHaveBeenCalledWith('a1')
        expect(registry.unregister).toHaveBeenCalledWith('a2')
    })

    it('treats an ADD event the same as a CHANGE event', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('a1')])
        const registry = makeAgentRegistry()
        const newAgent = makeAgentInterface({ id: 'a1' })
        const factory: RawAgentFactory = () => newAgent

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.ADD, path: 'agents.json' })

        expect(registry.register).toHaveBeenCalledWith('a1', newAgent)
    })

    it('skips re-hydration when the raw config fingerprint is unchanged', async () => {
        const repo = makeRawAgentConfigRepository()
        const rawConfig = makeRawConfig('a1')
        ;(repo.findAll as jest.Mock).mockResolvedValue([rawConfig])
        const registry = makeAgentRegistry()
        const factory: RawAgentFactory = jest.fn(raw => makeAgentInterface({ id: raw.id }))

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(factory).toHaveBeenCalledTimes(1)
    })

    it('logs a warning and continues when the factory throws for a raw config', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('bad-agent')])
        const registry = makeAgentRegistry()
        const factory: RawAgentFactory = () => {
            throw new Error('invalid config')
        }
        const logger = new NoopLogger()
        const warnSpy = jest.spyOn(logger, 'warn')

        const updater = new AgentConfigUpdater(repo, registry, factory, logger)
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(warnSpy).toHaveBeenCalledWith('Failed to hydrate agent "bad-agent"', { error: 'invalid config' })
        expect(registry.register).not.toHaveBeenCalled()
    })

    it('skips agents whose sub-agent list does not reference any removed agent', async () => {
        const repo = makeRawAgentConfigRepository()
        ;(repo.findAll as jest.Mock).mockResolvedValue([makeRawConfig('parent2')])

        const parent2 = makeAgentInterface({ id: 'parent2' })
        const orphan = makeAgentInterface({ id: 'orphan' })
        const registry = makeAgentRegistry([parent2, orphan])
        const factory: RawAgentFactory = raw => {
            const agent = registry.get(raw.id)
            if (!agent) throw new Error(`Agent "${raw.id}" not found in registry`)
            return agent
        }

        const updater = new AgentConfigUpdater(repo, registry, factory, new NoopLogger())
        await updater.handle({ type: WATCHER_EVENT_TYPE.CHANGE, path: 'agents.json' })

        expect(registry.unregister).toHaveBeenCalledWith('orphan')
        expect(parent2.update).toHaveBeenCalledTimes(1)
    })
})
