import { MCPServerRegistry } from '@mcp/registries/MCPServerRegistry'
import { MCPClientInterface, MCPConnectionManagerInterface } from '@mcp'
import { makeMCPClient } from '../../../../helpers/makeMCPClient'

function makeConnectionManager(): jest.Mocked<MCPConnectionManagerInterface> {
    return {
        add: jest.fn<Promise<void>, [string, MCPClientInterface]>().mockResolvedValue(undefined),
        remove: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
        connect: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
        disconnect: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
        connectAll: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        disconnectAll: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        getClient: jest.fn().mockReturnValue(null),
        listClients: jest.fn().mockReturnValue({}),
        getStatus: jest.fn().mockReturnValue(null),
        listStatuses: jest.fn().mockReturnValue({})
    }
}

describe('MCPServerRegistry', () => {
    let manager: jest.Mocked<MCPConnectionManagerInterface>
    let registry: MCPServerRegistry

    beforeEach(() => {
        manager = makeConnectionManager()
        registry = new MCPServerRegistry(manager)
    })

    describe('register()', () => {
        it('stores the client so it can be retrieved by alias', () => {
            const client = makeMCPClient()
            registry.register('my-server', client)
            expect(registry.get('my-server')).toBe(client)
        })

        it('calls connectionManager.add with the alias and client', async () => {
            const client = makeMCPClient()
            registry.register('my-server', client)
            expect(manager.add).toHaveBeenCalledWith('my-server', client)
        })

        it('does not throw if add rejects (fire-and-forget)', async () => {
            manager.add.mockRejectedValue(new Error('connect failed'))
            const client = makeMCPClient()
            expect(() => {
                registry.register('my-server', client)
            }).not.toThrow()
            await new Promise(resolve => setImmediate(resolve))
        })
    })

    describe('unregister()', () => {
        it('removes the client from the registry', () => {
            const client = makeMCPClient()
            registry.register('my-server', client)
            registry.unregister('my-server')
            expect(registry.get('my-server')).toBeNull()
        })

        it('calls connectionManager.remove with the alias', () => {
            const client = makeMCPClient()
            registry.register('my-server', client)
            registry.unregister('my-server')
            expect(manager.remove).toHaveBeenCalledWith('my-server')
        })

        it('does not throw if remove rejects (fire-and-forget)', async () => {
            manager.remove.mockRejectedValue(new Error('disconnect failed'))
            const client = makeMCPClient()
            registry.register('my-server', client)
            expect(() => {
                registry.unregister('my-server')
            }).not.toThrow()
        })
    })

    describe('inherited BaseRegistry methods', () => {
        it('get() returns null for unknown alias', () => {
            expect(registry.get('unknown')).toBeNull()
        })

        it('has() returns true for registered alias', () => {
            registry.register('s', makeMCPClient())
            expect(registry.has('s')).toBe(true)
        })

        it('has() returns false for unknown alias', () => {
            expect(registry.has('unknown')).toBe(false)
        })

        it('list() returns all registered clients', () => {
            registry.register('s1', makeMCPClient())
            registry.register('s2', makeMCPClient())
            expect(registry.list()).toHaveLength(2)
        })
    })
})
