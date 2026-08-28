import { getErrorMessage } from '@core/utils'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { MCPClientInterface } from '../../interfaces'
import {
    MCPCallToolResult,
    MCPPrompt,
    MCPResource,
    MCPResourceContent,
    MCPServerCapabilities,
    MCPServerConfig,
    MCPServerInfo,
    MCPServerStatus,
    MCPToolDefinition,
    MCP_SERVER_STATUS
} from '../../types'
import { AgentMCPError } from '../../errors'

export class MCPClient implements MCPClientInterface {
    readonly alias: string

    private readonly config: MCPServerConfig
    private client: Client | null = null
    private status: MCPServerStatus = MCP_SERVER_STATUS.DISCONNECTED

    private cachedServerInfo: MCPServerInfo | null = null
    private cachedCapabilities: MCPServerCapabilities | null = null
    private cachedTools: Array<MCPToolDefinition> | null = null
    private cachedResources: Array<MCPResource> | null = null
    private cachedPrompts: Array<MCPPrompt> | null = null

    private readonly connectCallbacks: Array<() => void> = []
    private readonly disconnectCallbacks: Array<() => void> = []

    constructor(alias: string, config: MCPServerConfig) {
        this.alias = alias
        this.config = config
    }

    getStatus(): MCPServerStatus {
        return this.status
    }

    getCapabilities(): MCPServerCapabilities | null {
        return this.cachedCapabilities
    }

    getConfig(): MCPServerConfig {
        return this.config
    }

    async getServerInfo(): Promise<MCPServerInfo> {
        this.getClient()

        if (!this.cachedServerInfo) {
            throw new AgentMCPError(`[MCPClient] "${this.alias}" is not connected`)
        }

        return this.cachedServerInfo
    }

    onConnect(callback: () => void): void {
        this.connectCallbacks.push(callback)
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallbacks.push(callback)
    }

    async connect(): Promise<void> {
        if (this.status === MCP_SERVER_STATUS.CONNECTED) {
            await this.disconnect()
        }

        this.status = MCP_SERVER_STATUS.CONNECTING
        this.clearCache()

        try {
            const transport = this.createTransport()
            const client = new Client({ name: this.alias, version: '1.0.0' })

            transport.onclose = () => {
                if (this.status === MCP_SERVER_STATUS.CONNECTED) {
                    this.status = MCP_SERVER_STATUS.DISCONNECTED
                    this.disconnectCallbacks.forEach(cb => {
                        cb()
                    })
                }
            }

            await client.connect(transport as unknown as Transport)

            const serverVersion = client.getServerVersion()

            if (!serverVersion) {
                throw new AgentMCPError(`[MCPClient] "${this.alias}" handshake failed: no server version received`)
            }

            this.client = client
            this.cachedServerInfo = {
                name: serverVersion.name,
                version: serverVersion.version
            }

            this.cachedCapabilities = this.resolveCapabilities(client)
            this.status = MCP_SERVER_STATUS.CONNECTED

            this.connectCallbacks.forEach(cb => {
                cb()
            })
        } catch (error) {
            this.status = MCP_SERVER_STATUS.ERROR
            this.client = null

            if (error instanceof AgentMCPError) throw error

            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" failed to connect: ${message}`, { cause: error })
        }
    }

    async disconnect(): Promise<void> {
        if (!this.client) return

        try {
            await this.client.close()
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" failed to disconnect: ${message}`, { cause: error })
        } finally {
            this.client = null
            this.status = MCP_SERVER_STATUS.DISCONNECTED
        }
    }

    async listTools(): Promise<Array<MCPToolDefinition>> {
        const client = this.getClient()

        if (this.cachedTools) return this.cachedTools

        try {
            const result = await client.listTools()

            this.cachedTools = result.tools.map(tool => ({
                name: tool.name,
                inputSchema: tool.inputSchema,
                ...(tool.description !== undefined && { description: tool.description }),
                ...(tool.outputSchema !== undefined && { outputSchema: tool.outputSchema })
            }))

            return this.cachedTools
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" listTools failed: ${message}`, { cause: error })
        }
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<MCPCallToolResult> {
        const client = this.getClient()

        try {
            const result = await client.callTool({ name, arguments: args }, CallToolResultSchema)

            if ('toolResult' in result) {
                throw new AgentMCPError(
                    `[MCPClient] "${this.alias}" callTool "${name}" returned a task-based result, which is not supported`
                )
            }

            return {
                content: result.content.map(part => {
                    switch (part.type) {
                        case 'text':
                            return { type: 'text' as const, text: part.text }

                        case 'image':
                            return { type: 'image' as const, data: part.data, mimeType: part.mimeType }

                        case 'audio':
                            return { type: 'audio' as const, data: part.data, mimeType: part.mimeType }

                        case 'resource_link':
                            return {
                                type: 'resource_link' as const,
                                uri: part.uri,
                                name: part.name,
                                ...(part.mimeType !== undefined && { mimeType: part.mimeType }),
                                ...(part.description !== undefined && { description: part.description })
                            }

                        case 'resource':
                            return {
                                type: 'resource' as const,
                                uri: part.resource.uri,
                                ...(part.resource.mimeType !== undefined && { mimeType: part.resource.mimeType }),
                                ...('text' in part.resource && { text: part.resource.text }),
                                ...('blob' in part.resource && { blob: part.resource.blob })
                            }
                    }
                }),
                isError: result.isError ?? false,
                ...(result.structuredContent !== undefined && { structuredContent: result.structuredContent })
            }
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" callTool "${name}" failed: ${message}`, {
                cause: error
            })
        }
    }

    async listResources(): Promise<Array<MCPResource>> {
        const client = this.getClient()

        if (this.cachedResources) return this.cachedResources

        try {
            const result = await client.listResources()

            this.cachedResources = result.resources.map(resource => ({
                uri: resource.uri,
                name: resource.name,
                ...(resource.description !== undefined && { description: resource.description }),
                ...(resource.mimeType !== undefined && { mimeType: resource.mimeType }),
                ...(resource.size !== undefined && { size: resource.size })
            }))

            return this.cachedResources
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" listResources failed: ${message}`, { cause: error })
        }
    }

    async readResource(uri: string): Promise<MCPResourceContent> {
        const client = this.getClient()

        try {
            const result = await client.readResource({ uri })
            const content = result.contents[0]

            if (!content) {
                throw new AgentMCPError(`[MCPClient] "${this.alias}" readResource "${uri}" returned no content`)
            }

            if ('text' in content) {
                return {
                    uri: content.uri,
                    text: content.text,
                    ...(content.mimeType !== undefined && { mimeType: content.mimeType })
                }
            }

            if ('blob' in content) {
                return {
                    uri: content.uri,
                    blob: content.blob,
                    ...(content.mimeType !== undefined && { mimeType: content.mimeType })
                }
            }

            throw new AgentMCPError(
                `[MCPClient] "${this.alias}" readResource "${uri}" returned content without text or blob`
            )
        } catch (error) {
            if (error instanceof AgentMCPError) throw error

            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" readResource "${uri}" failed: ${message}`, {
                cause: error
            })
        }
    }

    async listPrompts(): Promise<Array<MCPPrompt>> {
        const client = this.getClient()

        if (this.cachedPrompts) return this.cachedPrompts

        try {
            const result = await client.listPrompts()

            this.cachedPrompts = result.prompts.map(prompt => ({
                name: prompt.name,
                ...(prompt.description !== undefined && { description: prompt.description }),
                ...(prompt.arguments?.length && {
                    arguments: prompt.arguments.map(arg => ({
                        name: arg.name,
                        ...(arg.description !== undefined && { description: arg.description }),
                        ...(arg.required !== undefined && { required: arg.required })
                    }))
                })
            }))

            return this.cachedPrompts
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" listPrompts failed: ${message}`, { cause: error })
        }
    }

    async getPrompt(name: string, args?: Record<string, string>): Promise<string> {
        const client = this.getClient()

        try {
            const result = await client.getPrompt({
                name,
                ...(args !== undefined && { arguments: args })
            })

            return result.messages
                .map(msg => {
                    if (typeof msg.content === 'string') return msg.content
                    if (msg.content.type === 'text') return msg.content.text
                    return ''
                })
                .filter(Boolean)
                .join('\n')
        } catch (error) {
            const message = getErrorMessage(error)
            throw new AgentMCPError(`[MCPClient] "${this.alias}" getPrompt "${name}" failed: ${message}`, {
                cause: error
            })
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- some MCP servers still only support SSE; the SDK itself says clients must support both transports during the migration period
    private createTransport(): StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport {
        switch (this.config.type) {
            case 'stdio':
                return new StdioClientTransport({
                    command: this.config.command,
                    ...(this.config.args !== undefined && { args: this.config.args }),
                    ...(this.config.env !== undefined && { env: this.config.env })
                })

            case 'streamable-http':
                return new StreamableHTTPClientTransport(new URL(this.config.url), {
                    requestInit: {
                        ...(this.config.headers !== undefined && { headers: this.config.headers })
                    }
                })

            case 'sse':
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- some MCP servers still only support SSE; the SDK itself says clients must support both transports during the migration period
                return new SSEClientTransport(new URL(this.config.url), {
                    requestInit: {
                        ...(this.config.headers !== undefined && { headers: this.config.headers })
                    }
                })
        }
    }

    private resolveCapabilities(client: Client): MCPServerCapabilities {
        const caps = client.getServerCapabilities() ?? {}

        return {
            version: client.getServerVersion()?.version ?? 'unknown',
            hasTools: 'tools' in caps && caps.tools !== undefined,
            hasResources: 'resources' in caps && caps.resources !== undefined,
            hasPrompts: 'prompts' in caps && caps.prompts !== undefined,
            hasLogging: 'logging' in caps && caps.logging !== undefined,
            toolsListChanged:
                typeof caps.tools === 'object' && 'listChanged' in caps.tools ? Boolean(caps.tools.listChanged) : false,
            resourcesListChanged:
                typeof caps.resources === 'object' && 'listChanged' in caps.resources
                    ? Boolean(caps.resources.listChanged)
                    : false,
            resourcesSubscribe:
                typeof caps.resources === 'object' && 'subscribe' in caps.resources
                    ? Boolean(caps.resources.subscribe)
                    : false,
            promptsListChanged:
                typeof caps.prompts === 'object' && 'listChanged' in caps.prompts
                    ? Boolean(caps.prompts.listChanged)
                    : false
        }
    }

    private clearCache(): void {
        this.cachedServerInfo = null
        this.cachedCapabilities = null
        this.cachedTools = null
        this.cachedResources = null
        this.cachedPrompts = null
    }

    private getClient(): Client {
        if (this.status !== MCP_SERVER_STATUS.CONNECTED || !this.client) {
            throw new AgentMCPError(`[MCPClient] "${this.alias}" is not connected`)
        }

        return this.client
    }
}
