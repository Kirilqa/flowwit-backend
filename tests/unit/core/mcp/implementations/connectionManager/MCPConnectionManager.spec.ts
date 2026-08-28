import { MCPConnectionManager } from '@mcp/implementations/connectionManager/MCPConnectionManager'
import { MCP_SERVER_STATUS } from '@mcp'
import { NoopLogger } from '@logger'
import { makeMCPClient, MCPClientMock } from '../../../../../helpers/makeMCPClient'
import { makeLoggerMock } from '../../../../../helpers/makeLogger'

describe('MCPConnectionManager', () => {
    let manager: MCPConnectionManager
    let client: MCPClientMock

    beforeEach(() => {
        manager = new MCPConnectionManager(new NoopLogger())
        client = makeMCPClient()
    })

    describe('add()', () => {
        it('connects the client immediately', async () => {
            await manager.add('s1', client)
            expect(client.connect).toHaveBeenCalledTimes(1)
        })

        it('sets status to CONNECTED after successful connect', async () => {
            await manager.add('s1', client)
            expect(manager.getStatus('s1')?.status).toBe(MCP_SERVER_STATUS.CONNECTED)
        })

        it('sets status to ERROR when connect fails', async () => {
            client.connect.mockRejectedValue(new Error('refused'))
            await expect(manager.add('s1', client)).rejects.toThrow()
            expect(manager.getStatus('s1')?.status).toBe(MCP_SERVER_STATUS.ERROR)
        })

        it('replaces existing client under same alias', async () => {
            await manager.add('s1', client)
            const client2 = makeMCPClient()
            await manager.add('s1', client2)
            expect(manager.getClient('s1')).toBe(client2)
        })

        it('stores error message in status when connect fails', async () => {
            client.connect.mockRejectedValue(new Error('connection refused'))
            await expect(manager.add('s1', client)).rejects.toThrow()
            expect(manager.getStatus('s1')?.error).toBe('connection refused')
        })
    })

    describe('remove()', () => {
        it('is a no-op when alias does not exist', async () => {
            await expect(manager.remove('missing')).resolves.toBeUndefined()
        })

        it('removes the client from the manager', async () => {
            await manager.add('s1', client)
            await manager.remove('s1')
            expect(manager.getClient('s1')).toBeNull()
        })

        it('disconnects client if it was connected', async () => {
            await manager.add('s1', client)
            await manager.remove('s1')
            expect(client.disconnect).toHaveBeenCalledTimes(1)
        })

        it('does not call disconnect if client was not connected', async () => {
            client.connect.mockRejectedValue(new Error('failed'))
            await expect(manager.add('s1', client)).rejects.toThrow()
            await manager.remove('s1')
            expect(client.disconnect).not.toHaveBeenCalled()
        })
    })

    describe('connect()', () => {
        it('throws when alias does not exist', async () => {
            await expect(manager.connect('missing')).rejects.toThrow()
        })

        it('re-connects a previously disconnected client', async () => {
            await manager.add('s1', client)
            await manager.disconnect('s1')
            client.connect.mockClear()
            await manager.connect('s1')
            expect(client.connect).toHaveBeenCalledTimes(1)
        })
    })

    describe('disconnect()', () => {
        it('throws when alias does not exist', async () => {
            await expect(manager.disconnect('missing')).rejects.toThrow()
        })

        it('calls client.disconnect', async () => {
            await manager.add('s1', client)
            await manager.disconnect('s1')
            expect(client.disconnect).toHaveBeenCalledTimes(1)
        })

        it('sets status to DISCONNECTED', async () => {
            await manager.add('s1', client)
            await manager.disconnect('s1')
            expect(manager.getStatus('s1')?.status).toBe(MCP_SERVER_STATUS.DISCONNECTED)
        })
    })

    describe('connectAll() / disconnectAll()', () => {
        it('connectAll() connects all registered clients', async () => {
            const c1 = makeMCPClient()
            const c2 = makeMCPClient()
            await manager.add('s1', c1)
            await manager.add('s2', c2)
            c1.connect.mockClear()
            c2.connect.mockClear()
            await manager.disconnect('s1')
            await manager.disconnect('s2')
            await manager.connectAll()
            expect(c1.connect).toHaveBeenCalled()
            expect(c2.connect).toHaveBeenCalled()
        })

        it('disconnectAll() disconnects all connected clients', async () => {
            const c1 = makeMCPClient()
            const c2 = makeMCPClient()
            await manager.add('s1', c1)
            await manager.add('s2', c2)
            await manager.disconnectAll()
            expect(c1.disconnect).toHaveBeenCalled()
            expect(c2.disconnect).toHaveBeenCalled()
        })
    })

    describe('getClient()', () => {
        it('returns the client for a registered alias', async () => {
            await manager.add('s1', client)
            expect(manager.getClient('s1')).toBe(client)
        })

        it('returns null for an unknown alias', () => {
            expect(manager.getClient('missing')).toBeNull()
        })
    })

    describe('listClients()', () => {
        it('returns all registered clients', async () => {
            const c1 = makeMCPClient()
            const c2 = makeMCPClient()
            await manager.add('s1', c1)
            await manager.add('s2', c2)
            const clients = manager.listClients()
            expect(clients['s1']).toBe(c1)
            expect(clients['s2']).toBe(c2)
        })
    })

    describe('getStatus()', () => {
        it('returns null for unknown alias', () => {
            expect(manager.getStatus('missing')).toBeNull()
        })

        it('returns status details for registered alias', async () => {
            await manager.add('s1', client)
            const status = manager.getStatus('s1')
            expect(status?.status).toBe(MCP_SERVER_STATUS.CONNECTED)
        })
    })

    describe('listStatuses()', () => {
        it('returns statuses for all registered clients', async () => {
            await manager.add('s1', client)
            const statuses = manager.listStatuses()
            expect(statuses['s1']?.status).toBe(MCP_SERVER_STATUS.CONNECTED)
        })
    })

    describe('error handling in disconnectClient', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('warns to console when client.disconnect() throws', async () => {
            const logger = makeLoggerMock()
            const localManager = new MCPConnectionManager(logger)
            await localManager.add('s1', client)
            client.disconnect.mockRejectedValue(new Error('network error'))
            await localManager.disconnect('s1')
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('s1'), expect.anything())
        })

        it('still sets status to DISCONNECTED even when disconnect() throws', async () => {
            await manager.add('s1', client)
            client.disconnect.mockRejectedValue(new Error('failure'))
            await manager.disconnect('s1')
            expect(manager.getStatus('s1')?.status).toBe(MCP_SERVER_STATUS.DISCONNECTED)
        })
    })

    describe('connectAll() error handling', () => {
        afterEach(() => {
            jest.restoreAllMocks()
        })

        it('warns when one client fails to connect', async () => {
            const logger = makeLoggerMock()
            const localManager = new MCPConnectionManager(logger)
            const c1 = makeMCPClient()
            const c2 = makeMCPClient()
            await localManager.add('s1', c1)
            await localManager.add('s2', c2)
            await localManager.disconnect('s1')
            await localManager.disconnect('s2')
            c1.connect.mockRejectedValue(new Error('refused'))
            await localManager.connectAll()
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('s1'), expect.anything())
        })

        it('still connects other clients when one fails', async () => {
            const c1 = makeMCPClient()
            const c2 = makeMCPClient()
            await manager.add('s1', c1)
            await manager.add('s2', c2)
            await manager.disconnect('s1')
            await manager.disconnect('s2')
            c1.connect.mockRejectedValue(new Error('refused'))
            await manager.connectAll()
            expect(c2.connect).toHaveBeenCalled()
        })
    })

    describe('onDisconnect reconnect behavior', () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
            jest.restoreAllMocks()
        })

        it('schedules reconnect when client disconnects unexpectedly', async () => {
            await manager.add('s1', client)
            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall
            client.connect.mockClear()
            disconnectCallback()
            await jest.runAllTimersAsync()
            expect(client.connect).toHaveBeenCalled()
        })

        it('does not reconnect when manually disconnected', async () => {
            await manager.add('s1', client)
            await manager.disconnect('s1')
            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall
            client.connect.mockClear()
            disconnectCallback()
            await jest.runAllTimersAsync()
            expect(client.connect).not.toHaveBeenCalled()
        })

        it('sets status to ERROR and stops after max reconnect attempts', async () => {
            await manager.add('s1', client)
            client.connect.mockRejectedValue(new Error('refused'))

            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall

            disconnectCallback()
            await jest.runAllTimersAsync()

            expect(manager.getStatus('s1')?.status).toBe(MCP_SERVER_STATUS.ERROR)
        })

        it('logs info on successful reconnect after unexpected disconnect', async () => {
            const logger = makeLoggerMock()
            const localManager = new MCPConnectionManager(logger)

            await localManager.add('s1', client)
            client.connect.mockClear()

            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall

            disconnectCallback()
            await jest.runAllTimersAsync()

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('reconnected successfully'),
                expect.anything()
            )
        })

        it('cancels pending reconnect timer when manually disconnected before it fires', async () => {
            await manager.add('s1', client)
            client.connect.mockClear()

            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall

            disconnectCallback()

            await manager.disconnect('s1')

            await jest.runAllTimersAsync()
            expect(client.connect).not.toHaveBeenCalled()
        })

        it('does not reconnect when the alias was removed before the timer fires', async () => {
            await manager.add('s1', client)
            client.connect.mockClear()

            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall

            disconnectCallback()

            await manager.remove('s1')

            await jest.runAllTimersAsync()
            expect(client.connect).not.toHaveBeenCalled()
        })

        it('schedules retry after a single failed reconnect attempt', async () => {
            await manager.add('s1', client)
            client.connect.mockClear()
            client.connect.mockRejectedValueOnce(new Error('transient'))

            const [firstCall] = client.onDisconnect.mock.calls
            if (!firstCall) throw new Error('Expected onDisconnect to have been called')
            const [disconnectCallback] = firstCall

            disconnectCallback()

            await jest.advanceTimersByTimeAsync(1001)
            await jest.advanceTimersByTimeAsync(2001)

            expect(client.connect).toHaveBeenCalledTimes(2)
        })
    })
})
