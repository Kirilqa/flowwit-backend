import { BaseRegistry } from '@core/bases'
import {
    MCPClientFactory,
    MCPClientInterface,
    MCPServerConfig,
    MCPServerConfigRepositoryInterface,
    MCPServerRegistryInterface
} from '@mcp'
import { MCPConfigUpdater } from '@mcp/updaters/MCPConfigUpdater'
import { AgentRegistryInterface } from '@agent/interfaces/registries'
import { AgentInterface } from '@agent/interfaces'
import { AgentConfig } from '@agent/types'
import { WATCHER_EVENT_TYPE } from '@core/watcher'

class InMemoryConfigRepository implements MCPServerConfigRepositoryInterface {
    private readonly store = new Map<string, MCPServerConfig>()

    async findAll(): Promise<Array<MCPServerConfig>> {
        return [...this.store.values()]
    }

    async findById(name: string): Promise<MCPServerConfig | null> {
        return this.store.get(name) ?? null
    }

    async create(config: MCPServerConfig): Promise<MCPServerConfig> {
        this.store.set(config.name, config)
        return config
    }

    async update(name: string, patch: Partial<MCPServerConfig>): Promise<MCPServerConfig> {
        const existing = this.store.get(name)
        if (!existing) throw new Error(`Not found: ${name}`)
        const updated = { ...existing, ...patch } as MCPServerConfig
        this.store.set(name, updated)
        return updated
    }

    async delete(name: string): Promise<void> {
        this.store.delete(name)
    }

    async ensureInitialized(): Promise<void> {}
}

class SimpleMCPRegistry extends BaseRegistry<MCPClientInterface> implements MCPServerRegistryInterface {}

class NullGetMCPRegistry extends SimpleMCPRegistry {
    override get(_alias: string): MCPClientInterface | null {
        return null
    }
}

class SimpleAgentRegistry extends BaseRegistry<AgentInterface> implements AgentRegistryInterface {}

function makeFakeClient(alias: string): MCPClientInterface {
    return {
        alias,
        connect: async () => {},
        disconnect: async () => {},
        onConnect: () => {},
        onDisconnect: () => {},
        getStatus: () => 'connected' as never,
        getCapabilities: () => null,
        getConfig: () => ({ name: alias, type: 'stdio', command: 'x' }) as MCPServerConfig,
        getServerInfo: async () => ({ name: alias, version: '1.0.0' }),
        listTools: async () => [],
        callTool: async () => ({ content: [], isError: false }),
        listResources: async () => [],
        readResource: async () => ({ content: '' }) as never,
        listPrompts: async () => [],
        getPrompt: async () => ''
    }
}

const fakeFactory: MCPClientFactory = config => makeFakeClient(config.name)

function httpConfig(name: string, url = 'http://localhost:3000'): MCPServerConfig {
    return { name, type: 'streamable-http', url }
}

const addEvent = { type: WATCHER_EVENT_TYPE.ADD, path: '/fake/mcp.json' } as const
const changeEvent = { type: WATCHER_EVENT_TYPE.CHANGE, path: '/fake/mcp.json' } as const
const unlinkEvent = { type: WATCHER_EVENT_TYPE.UNLINK, path: '/fake/mcp.json' } as const

describe('MCPConfigUpdater (integration)', () => {
    let configRepo: InMemoryConfigRepository
    let serverRegistry: SimpleMCPRegistry
    let agentRegistry: SimpleAgentRegistry
    let updater: MCPConfigUpdater

    beforeEach(() => {
        configRepo = new InMemoryConfigRepository()
        serverRegistry = new SimpleMCPRegistry()
        agentRegistry = new SimpleAgentRegistry()
        updater = new MCPConfigUpdater(fakeFactory, configRepo, serverRegistry, agentRegistry)
    })

    describe('handle(ADD)', () => {
        it('registers a client for each config in the repository', async () => {
            await configRepo.create(httpConfig('server-a'))
            await configRepo.create(httpConfig('server-b'))

            await updater.handle(addEvent)

            expect(serverRegistry.has('server-a')).toBe(true)
            expect(serverRegistry.has('server-b')).toBe(true)
        })

        it('skips re-registering when fingerprint is unchanged', async () => {
            await configRepo.create(httpConfig('stable'))
            await updater.handle(addEvent)

            const clientAfterFirst = serverRegistry.get('stable')

            await updater.handle(addEvent)

            expect(serverRegistry.get('stable')).toBe(clientAfterFirst)
        })

        it('re-registers when config url changes', async () => {
            await configRepo.create(httpConfig('changing', 'http://old.com'))
            await updater.handle(addEvent)

            await configRepo.update('changing', { url: 'http://new.com' } as Partial<MCPServerConfig>)
            await updater.handle(changeEvent)

            expect(serverRegistry.has('changing')).toBe(true)
        })

        it('removes servers that are no longer in the repository', async () => {
            await configRepo.create(httpConfig('gone'))
            await updater.handle(addEvent)

            expect(serverRegistry.has('gone')).toBe(true)

            await configRepo.delete('gone')
            await updater.handle(addEvent)

            expect(serverRegistry.has('gone')).toBe(false)
        })

        it('updates agents whose mcpServers include a changed server', async () => {
            await configRepo.create(httpConfig('svc'))
            await updater.handle(addEvent)

            const client = serverRegistry.get('svc')
            if (!client) throw new Error('expected client to be registered')

            const updates: Array<Partial<AgentConfig>> = []
            const fakeAgent: AgentInterface = {
                config: { model: 'x', systemPrompt: '', mcpServers: [client] } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('agent-1', fakeAgent)

            await configRepo.update('svc', { url: 'http://updated.com' } as Partial<MCPServerConfig>)
            await updater.handle(changeEvent)

            expect(updates.length).toBeGreaterThan(0)
        })

        it('skips agents whose mcpServers list is empty', async () => {
            await configRepo.create(httpConfig('svc'))

            const updates: Array<Partial<AgentConfig>> = []
            const fakeAgent: AgentInterface = {
                config: { model: 'x', systemPrompt: '' } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('empty-agent', fakeAgent)

            await updater.handle(addEvent)

            expect(updates).toHaveLength(0)
        })

        it('falls back to the stale server reference when the registry has no entry for it', async () => {
            const nullGetRegistry = new NullGetMCPRegistry()
            updater = new MCPConfigUpdater(fakeFactory, configRepo, nullGetRegistry, agentRegistry)

            await configRepo.create(httpConfig('svc'))
            const staleClient = makeFakeClient('svc')
            const updates: Array<Partial<AgentConfig>> = []
            const fakeAgent: AgentInterface = {
                config: { model: 'x', systemPrompt: '', mcpServers: [staleClient] } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('agent-1', fakeAgent)

            await updater.handle(addEvent)

            expect(updates[0]?.mcpServers).toEqual([staleClient])
        })

        it('skips agents whose servers are not among the changed ones', async () => {
            await configRepo.create(httpConfig('svc-a'))
            await updater.handle(addEvent)

            const clientA = serverRegistry.get('svc-a')
            if (!clientA) throw new Error('expected client')

            await configRepo.create(httpConfig('svc-b'))
            const updates: Array<Partial<AgentConfig>> = []
            const fakeAgent: AgentInterface = {
                config: { model: 'x', systemPrompt: '', mcpServers: [clientA] } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('agent-a-only', fakeAgent)

            await updater.handle(changeEvent)

            expect(updates).toHaveLength(0)
        })
    })

    describe('handle(CHANGE)', () => {
        it('behaves the same as ADD for upsert', async () => {
            await configRepo.create(httpConfig('svc'))
            await updater.handle(changeEvent)

            expect(serverRegistry.has('svc')).toBe(true)
        })

        it('re-registers on repeated CHANGE only when data changed', async () => {
            await configRepo.create(httpConfig('x', 'http://a.com'))
            await updater.handle(addEvent)

            const first = serverRegistry.get('x')
            await updater.handle(changeEvent)
            expect(serverRegistry.get('x')).toBe(first)

            await configRepo.update('x', { url: 'http://b.com' } as Partial<MCPServerConfig>)
            await updater.handle(changeEvent)
            expect(serverRegistry.get('x')).not.toBe(first)
        })
    })

    describe('handle(UNLINK)', () => {
        it('unregisters all servers', async () => {
            await configRepo.create(httpConfig('a'))
            await configRepo.create(httpConfig('b'))
            await updater.handle(addEvent)

            await updater.handle(unlinkEvent)

            expect(serverRegistry.list()).toHaveLength(0)
        })

        it('resets agents mcpServers to empty array', async () => {
            await configRepo.create(httpConfig('svc'))
            await updater.handle(addEvent)

            const client = serverRegistry.get('svc')
            if (!client) throw new Error('expected client')

            const updates: Array<Partial<AgentConfig>> = []
            const fakeAgent: AgentInterface = {
                config: { model: 'x', systemPrompt: '', mcpServers: [client] } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('a1', fakeAgent)

            await updater.handle(unlinkEvent)

            const lastUpdate = updates[updates.length - 1]
            expect(lastUpdate?.mcpServers).toEqual([])
        })

        it('clears fingerprints so next ADD re-registers everything', async () => {
            await configRepo.create(httpConfig('svc'))
            await updater.handle(addEvent)
            const firstClient = serverRegistry.get('svc')

            await updater.handle(unlinkEvent)
            await updater.handle(addEvent)

            expect(serverRegistry.get('svc')).not.toBe(firstClient)
        })

        it('leaves registry empty when called with nothing registered', async () => {
            await updater.handle(unlinkEvent)
            expect(serverRegistry.list()).toHaveLength(0)
        })

        it('skips agents without mcpServers during unlink', async () => {
            await configRepo.create(httpConfig('svc'))
            await updater.handle(addEvent)

            const updates: Array<Partial<AgentConfig>> = []
            const agentWithNoServers: AgentInterface = {
                config: { model: 'x', systemPrompt: '' } as AgentConfig,
                update: (patch: Partial<AgentConfig>) => {
                    updates.push(patch)
                },
                run: async function* () {},
                stop: async () => {}
            }
            agentRegistry.register('no-servers', agentWithNoServers)

            await updater.handle(unlinkEvent)

            expect(updates).toHaveLength(0)
        })
    })
})
