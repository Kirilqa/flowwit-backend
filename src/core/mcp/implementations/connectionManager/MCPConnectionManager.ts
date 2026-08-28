import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import { AgentMCPError } from '../../errors'
import { MCPClientInterface, MCPConnectionManagerInterface } from '../../interfaces'
import { MCP_SERVER_STATUS, MCPConnectionState, MCPServerStatusDetails } from '../../types'

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MULTIPLIER = 2
const RECONNECT_MAX_DELAY_MS = 30000
const RECONNECT_MAX_ATTEMPTS = 10

export class MCPConnectionManager implements MCPConnectionManagerInterface {
    private readonly connections = new Map<string, MCPConnectionState>()
    private readonly logger: LoggerInterface

    constructor(logger: LoggerInterface) {
        this.logger = logger.child('MCPConnectionManager')
    }

    async add(alias: string, client: MCPClientInterface): Promise<void> {
        if (this.connections.has(alias)) {
            await this.remove(alias)
        }

        this.connections.set(alias, {
            client,
            statusDetails: {
                status: MCP_SERVER_STATUS.DISCONNECTED
            },
            reconnectTimer: null,
            manuallyDisconnected: false,
            disconnectSubscribed: false
        })

        await this.connect(alias)
    }

    async remove(alias: string): Promise<void> {
        const state = this.connections.get(alias)

        if (!state) return

        this.clearReconnectTimer(state)
        state.manuallyDisconnected = true

        if (state.statusDetails.status === MCP_SERVER_STATUS.CONNECTED) {
            await this.disconnectClient(alias, state).catch((error: unknown) => {
                this.logger.warn(`Error disconnecting "${alias}" during remove`, {
                    alias,
                    error: getErrorMessage(error)
                })
            })
        }

        this.connections.delete(alias)
    }

    async connect(alias: string): Promise<void> {
        const state = this.connections.get(alias)

        if (!state) {
            throw new AgentMCPError(`[MCPConnectionManager] Client "${alias}" not found`)
        }

        state.manuallyDisconnected = false

        await this.connectClient(alias, state)
    }

    async disconnect(alias: string): Promise<void> {
        const state = this.connections.get(alias)

        if (!state) {
            throw new AgentMCPError(`[MCPConnectionManager] Client "${alias}" not found`)
        }

        this.clearReconnectTimer(state)
        state.manuallyDisconnected = true

        await this.disconnectClient(alias, state)
    }

    async connectAll(): Promise<void> {
        await Promise.all(
            Array.from(this.connections.keys()).map(alias =>
                this.connect(alias).catch((error: unknown) => {
                    this.logger.warn(`Failed to connect "${alias}"`, { alias, error: getErrorMessage(error) })
                })
            )
        )
    }

    async disconnectAll(): Promise<void> {
        await Promise.all(
            Array.from(this.connections.keys()).map(alias =>
                this.disconnect(alias).catch((error: unknown) => {
                    this.logger.warn(`Failed to disconnect "${alias}"`, { alias, error: getErrorMessage(error) })
                })
            )
        )
    }

    getClient(alias: string): MCPClientInterface | null {
        return this.connections.get(alias)?.client ?? null
    }

    listClients(): Record<string, MCPClientInterface> {
        return Object.fromEntries(Array.from(this.connections.entries()).map(([alias, state]) => [alias, state.client]))
    }

    getStatus(alias: string): MCPServerStatusDetails | null {
        return this.connections.get(alias)?.statusDetails ?? null
    }

    listStatuses(): Record<string, MCPServerStatusDetails> {
        return Object.fromEntries(
            Array.from(this.connections.entries()).map(([alias, state]) => [alias, state.statusDetails])
        )
    }

    private async connectClient(alias: string, state: MCPConnectionState): Promise<void> {
        this.clearReconnectTimer(state)

        state.statusDetails = {
            ...state.statusDetails,
            status: MCP_SERVER_STATUS.CONNECTING,
            lastAttemptAt: Date.now()
        }

        try {
            await state.client.connect()

            const lastAttemptAt = state.statusDetails.lastAttemptAt

            state.statusDetails = {
                status: MCP_SERVER_STATUS.CONNECTED,
                connectedAt: Date.now(),
                reconnectAttempts: 0,
                ...(lastAttemptAt !== undefined && { lastAttemptAt })
            }

            if (!state.disconnectSubscribed) {
                this.subscribeToDisconnect(alias, state)
                state.disconnectSubscribed = true
            }
        } catch (error) {
            const message = getErrorMessage(error)

            state.statusDetails = {
                ...state.statusDetails,
                status: MCP_SERVER_STATUS.ERROR,
                error: message
            }

            throw error
        }
    }

    private async disconnectClient(alias: string, state: MCPConnectionState): Promise<void> {
        try {
            await state.client.disconnect()
        } catch (error) {
            this.logger.warn(`Error during disconnect of "${alias}"`, { alias, error: getErrorMessage(error) })
        } finally {
            state.statusDetails = {
                ...state.statusDetails,
                status: MCP_SERVER_STATUS.DISCONNECTED
            }
        }
    }

    private subscribeToDisconnect(alias: string, state: MCPConnectionState): void {
        state.client.onDisconnect(() => {
            if (state.manuallyDisconnected) return

            this.logger.warn(`"${alias}" disconnected unexpectedly, scheduling reconnect`, { alias })

            state.statusDetails = {
                ...state.statusDetails,
                status: MCP_SERVER_STATUS.DISCONNECTED
            }

            this.scheduleReconnect(alias, state, 1)
        })
    }

    private scheduleReconnect(alias: string, state: MCPConnectionState, attempt: number): void {
        if (attempt > RECONNECT_MAX_ATTEMPTS) {
            this.logger.error(`"${alias}" exceeded max reconnect attempts, giving up`, {
                alias,
                maxAttempts: RECONNECT_MAX_ATTEMPTS
            })

            state.statusDetails = {
                ...state.statusDetails,
                status: MCP_SERVER_STATUS.ERROR,
                error: `Exceeded max reconnect attempts (${RECONNECT_MAX_ATTEMPTS})`,
                reconnectAttempts: attempt - 1
            }

            return
        }

        const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(RECONNECT_MULTIPLIER, attempt - 1),
            RECONNECT_MAX_DELAY_MS
        )

        this.logger.info(`Reconnecting "${alias}"`, { alias, delay, attempt, maxAttempts: RECONNECT_MAX_ATTEMPTS })

        state.statusDetails = {
            ...state.statusDetails,
            reconnectAttempts: attempt
        }

        state.reconnectTimer = setTimeout(() => {
            void (async () => {
                state.reconnectTimer = null

                if (state.manuallyDisconnected || !this.connections.has(alias)) return

                try {
                    await this.connectClient(alias, state)
                    this.logger.info(`"${alias}" reconnected successfully`, { alias })
                } catch {
                    this.scheduleReconnect(alias, state, attempt + 1)
                }
            })()
        }, delay)
    }

    private clearReconnectTimer(state: MCPConnectionState): void {
        if (state.reconnectTimer !== null) {
            clearTimeout(state.reconnectTimer)
            state.reconnectTimer = null
        }
    }
}
