import { MCPClient } from '@mcp/implementations/client/MCPClient'
import { AgentMCPError, MCP_SERVER_STATUS, MCPServerConfig } from '@mcp'

type MockInternalClient = {
    connect: jest.Mock
    close: jest.Mock
    listTools: jest.Mock
    callTool: jest.Mock
    listResources: jest.Mock
    readResource: jest.Mock
    listPrompts: jest.Mock
    getPrompt: jest.Mock
    getServerVersion: jest.Mock
    getServerCapabilities: jest.Mock
}

function makeMockInternalClient(): MockInternalClient {
    return {
        connect: jest.fn(),
        close: jest.fn(),
        listTools: jest.fn(),
        callTool: jest.fn(),
        listResources: jest.fn(),
        readResource: jest.fn(),
        listPrompts: jest.fn(),
        getPrompt: jest.fn(),
        getServerVersion: jest.fn(),
        getServerCapabilities: jest.fn()
    }
}

let mockInternalClient: MockInternalClient
let mockTransport: { onclose: (() => void) | null }

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => mockInternalClient)
}))

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: jest.fn().mockImplementation(() => mockTransport)
}))

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
    StreamableHTTPClientTransport: jest.fn().mockImplementation(() => mockTransport)
}))

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
    SSEClientTransport: jest.fn().mockImplementation(() => mockTransport)
}))

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

function stdioConfig(alias = 'test'): MCPServerConfig {
    return { name: alias, type: 'stdio', command: 'node', args: ['server.js'] }
}

function httpConfig(alias = 'http'): MCPServerConfig {
    return { name: alias, type: 'streamable-http', url: 'http://localhost:3000' }
}

function sseConfig(alias = 'sse'): MCPServerConfig {
    return { name: alias, type: 'sse', url: 'http://localhost:3000/sse' }
}

function stdioConfigWithEnv(alias = 'test'): MCPServerConfig {
    return { name: alias, type: 'stdio', command: 'node', args: ['server.js'], env: { NODE_ENV: 'test' } }
}

function httpConfigWithHeaders(alias = 'http'): MCPServerConfig {
    return {
        name: alias,
        type: 'streamable-http',
        url: 'http://localhost:3000',
        headers: { Authorization: 'Bearer token' }
    }
}

function sseConfigWithHeaders(alias = 'sse'): MCPServerConfig {
    return {
        name: alias,
        type: 'sse',
        url: 'http://localhost:3000/sse',
        headers: { Authorization: 'Bearer token' }
    }
}

async function connectClient(
    client: MCPClient,
    serverVersion = { name: 'srv', version: '1.0.0' },
    capabilities: Record<string, unknown> = {}
): Promise<void> {
    mockInternalClient.connect.mockResolvedValueOnce(undefined)
    mockInternalClient.getServerVersion.mockReturnValue(serverVersion)
    mockInternalClient.getServerCapabilities.mockReturnValue(capabilities)
    await client.connect()
}

describe('MCPClient', () => {
    beforeEach(() => {
        mockInternalClient = makeMockInternalClient()
        mockTransport = { onclose: null }
        jest.clearAllMocks()
    })

    describe('constructor + getters', () => {
        it('sets alias from constructor', () => {
            const client = new MCPClient('my-alias', stdioConfig('my-alias'))
            expect(client.alias).toBe('my-alias')
        })

        it('initial status is DISCONNECTED', () => {
            const client = new MCPClient('s', stdioConfig())
            expect(client.getStatus()).toBe(MCP_SERVER_STATUS.DISCONNECTED)
        })

        it('getCapabilities returns null before connecting', () => {
            const client = new MCPClient('s', stdioConfig())
            expect(client.getCapabilities()).toBeNull()
        })

        it('getConfig returns the config passed to constructor', () => {
            const config = stdioConfig('cfg')
            const client = new MCPClient('cfg', config)
            expect(client.getConfig()).toBe(config)
        })
    })

    describe('connect()', () => {
        it('sets status to CONNECTED on success', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            expect(client.getStatus()).toBe(MCP_SERVER_STATUS.CONNECTED)
        })

        it('calls onConnect callbacks after successful connection', async () => {
            const client = new MCPClient('s', stdioConfig())
            const cb = jest.fn()
            client.onConnect(cb)
            await connectClient(client)
            expect(cb).toHaveBeenCalledTimes(1)
        })

        it('creates StdioClientTransport for stdio config', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            expect(StdioClientTransport).toHaveBeenCalled()
        })

        it('creates StreamableHTTPClientTransport for streamable-http config', async () => {
            const client = new MCPClient('h', httpConfig())
            await connectClient(client)
            expect(StreamableHTTPClientTransport).toHaveBeenCalled()
        })

        it('creates SSEClientTransport for sse config', async () => {
            const client = new MCPClient('e', sseConfig())
            await connectClient(client)
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- verifying the fallback transport for MCP servers that only support SSE
            expect(SSEClientTransport).toHaveBeenCalled()
        })

        it('passes env to StdioClientTransport when configured', async () => {
            const client = new MCPClient('s', stdioConfigWithEnv())
            await connectClient(client)
            expect(StdioClientTransport).toHaveBeenCalledWith(expect.objectContaining({ env: { NODE_ENV: 'test' } }))
        })

        it('passes headers to StreamableHTTPClientTransport when configured', async () => {
            const client = new MCPClient('h', httpConfigWithHeaders())
            await connectClient(client)
            expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ requestInit: { headers: { Authorization: 'Bearer token' } } })
            )
        })

        it('passes headers to SSEClientTransport when configured', async () => {
            const client = new MCPClient('e', sseConfigWithHeaders())
            await connectClient(client)
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- verifying the fallback transport for MCP servers that only support SSE
            expect(SSEClientTransport).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ requestInit: { headers: { Authorization: 'Bearer token' } } })
            )
        })

        it('caches server info after connection', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client, { name: 'my-server', version: '2.0.0' })
            const info = await client.getServerInfo()
            expect(info.name).toBe('my-server')
            expect(info.version).toBe('2.0.0')
        })

        it('sets status to ERROR and throws AgentMCPError on connect failure', async () => {
            const client = new MCPClient('s', stdioConfig())
            mockInternalClient.connect.mockRejectedValueOnce(new Error('refused'))
            mockInternalClient.getServerVersion.mockReturnValue({ name: 'x', version: '1' })
            mockInternalClient.getServerCapabilities.mockReturnValue({})

            await expect(client.connect()).rejects.toBeInstanceOf(AgentMCPError)
            expect(client.getStatus()).toBe(MCP_SERVER_STATUS.ERROR)
        })

        it('throws AgentMCPError when handshake returns no server version', async () => {
            const client = new MCPClient('s', stdioConfig())
            mockInternalClient.connect.mockResolvedValueOnce(undefined)
            mockInternalClient.getServerVersion.mockReturnValue(undefined)

            await expect(client.connect()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('disconnects existing connection before reconnecting', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.close.mockResolvedValueOnce(undefined)
            await connectClient(client)
            expect(mockInternalClient.close).toHaveBeenCalledTimes(1)
        })

        it('calls onDisconnect callbacks when transport closes unexpectedly', async () => {
            const client = new MCPClient('s', stdioConfig())
            const cb = jest.fn()
            client.onDisconnect(cb)
            await connectClient(client)

            mockTransport.onclose?.()
            expect(cb).toHaveBeenCalledTimes(1)
        })

        it('does not call onDisconnect when already manually disconnected', async () => {
            const client = new MCPClient('s', stdioConfig())
            const cb = jest.fn()
            client.onDisconnect(cb)
            await connectClient(client)
            mockInternalClient.close.mockResolvedValueOnce(undefined)
            await client.disconnect()

            mockTransport.onclose?.()
            expect(cb).not.toHaveBeenCalled()
        })
    })

    describe('disconnect()', () => {
        it('sets status to DISCONNECTED', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.close.mockResolvedValueOnce(undefined)
            await client.disconnect()
            expect(client.getStatus()).toBe(MCP_SERVER_STATUS.DISCONNECTED)
        })

        it('is a no-op when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.disconnect()).resolves.toBeUndefined()
        })

        it('throws AgentMCPError when close fails', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.close.mockRejectedValueOnce(new Error('close failed'))
            await expect(client.disconnect()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('sets status to DISCONNECTED even when close throws', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.close.mockRejectedValueOnce(new Error('close failed'))
            await client.disconnect().catch(() => {})
            expect(client.getStatus()).toBe(MCP_SERVER_STATUS.DISCONNECTED)
        })
    })

    describe('getServerInfo()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.getServerInfo()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('throws AgentMCPError when connected but cachedServerInfo is missing', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            ;(client as unknown as { cachedServerInfo: unknown }).cachedServerInfo = null
            await expect(client.getServerInfo()).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('listTools()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.listTools()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('returns mapped tool definitions', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listTools.mockResolvedValueOnce({
                tools: [{ name: 'my_tool', inputSchema: { type: 'object' }, description: 'A tool' }]
            })
            const tools = await client.listTools()
            expect(tools[0]).toMatchObject({ name: 'my_tool', description: 'A tool' })
        })

        it('returns cached result on second call', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listTools.mockResolvedValue({ tools: [] })
            await client.listTools()
            await client.listTools()
            expect(mockInternalClient.listTools).toHaveBeenCalledTimes(1)
        })

        it('includes outputSchema when the tool declares one', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listTools.mockResolvedValueOnce({
                tools: [
                    {
                        name: 'my_tool',
                        inputSchema: { type: 'object' },
                        outputSchema: { type: 'object', properties: {} }
                    }
                ]
            })
            const tools = await client.listTools()
            expect(tools[0]).toMatchObject({ outputSchema: { type: 'object', properties: {} } })
        })

        it('omits description when the tool has none', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listTools.mockResolvedValueOnce({
                tools: [{ name: 'bare_tool', inputSchema: { type: 'object' } }]
            })
            const tools = await client.listTools()
            expect(tools[0]).not.toHaveProperty('description')
        })

        it('wraps listTools error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listTools.mockRejectedValueOnce(new Error('fail'))
            await expect(client.listTools()).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('callTool()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.callTool('tool', {})).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('returns mapped text content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [{ type: 'text', text: 'result' }],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({ type: 'text', text: 'result' })
        })

        it('returns mapped image content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [{ type: 'image', data: 'b64', mimeType: 'image/png' }],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({ type: 'image', data: 'b64' })
        })

        it('returns mapped audio content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [{ type: 'audio', data: 'aud', mimeType: 'audio/mp3' }],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({ type: 'audio', data: 'aud' })
        })

        it('returns mapped resource content with text', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [
                    { type: 'resource', resource: { uri: 'file:///x', text: 'content', mimeType: 'text/plain' } }
                ],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({ type: 'resource', uri: 'file:///x' })
        })

        it('returns mapped resource content with blob', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [{ type: 'resource', resource: { uri: 'file:///img', blob: 'data' } }],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({ type: 'resource', uri: 'file:///img' })
        })

        it('returns mapped resource_link content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [
                    {
                        type: 'resource_link',
                        uri: 'file:///readme.md',
                        name: 'readme.md',
                        mimeType: 'text/markdown',
                        description: 'Project readme'
                    }
                ],
                isError: false
            })
            const result = await client.callTool('tool', {})
            expect(result.content[0]).toMatchObject({
                type: 'resource_link',
                uri: 'file:///readme.md',
                name: 'readme.md',
                mimeType: 'text/markdown',
                description: 'Project readme'
            })
        })

        it('handles response without content field', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({ content: [], isError: false })
            const result = await client.callTool('tool', {})
            expect(result.content).toEqual([])
        })

        it('includes structuredContent when present', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({
                content: [],
                isError: false,
                structuredContent: { key: 'value' }
            })
            const result = await client.callTool('tool', {})
            expect(result.structuredContent).toEqual({ key: 'value' })
        })

        it('throws AgentMCPError when result is task-based (contains toolResult)', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({ toolResult: { status: 'pending' } })
            await expect(client.callTool('tool', {})).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('defaults isError to false when the response omits it', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockResolvedValueOnce({ content: [] })
            const result = await client.callTool('tool', {})
            expect(result.isError).toBe(false)
        })

        it('wraps callTool error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.callTool.mockRejectedValueOnce(new Error('fail'))
            await expect(client.callTool('tool', {})).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('listResources()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.listResources()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('returns mapped resources', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listResources.mockResolvedValueOnce({
                resources: [{ uri: 'file:///x', name: 'x', description: 'desc', mimeType: 'text/plain' }]
            })
            const resources = await client.listResources()
            expect(resources[0]).toMatchObject({ uri: 'file:///x', name: 'x' })
        })

        it('includes size when the resource declares one', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listResources.mockResolvedValueOnce({
                resources: [{ uri: 'file:///x', name: 'x', size: 1024 }]
            })
            const resources = await client.listResources()
            expect(resources[0]).toMatchObject({ size: 1024 })
        })

        it('omits description when the resource has none', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listResources.mockResolvedValueOnce({
                resources: [{ uri: 'file:///bare', name: 'bare' }]
            })
            const resources = await client.listResources()
            expect(resources[0]).not.toHaveProperty('description')
        })

        it('returns cached result on second call', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listResources.mockResolvedValue({ resources: [] })
            await client.listResources()
            await client.listResources()
            expect(mockInternalClient.listResources).toHaveBeenCalledTimes(1)
        })

        it('wraps listResources error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listResources.mockRejectedValueOnce(new Error('fail'))
            await expect(client.listResources()).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('readResource()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.readResource('file:///x')).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('returns text resource content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockResolvedValueOnce({
                contents: [{ uri: 'file:///x', text: 'hello', mimeType: 'text/plain' }]
            })
            const result = await client.readResource('file:///x')
            expect(result).toMatchObject({ uri: 'file:///x', text: 'hello' })
        })

        it('returns blob resource content', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockResolvedValueOnce({
                contents: [{ uri: 'file:///img', blob: 'data' }]
            })
            const result = await client.readResource('file:///img')
            expect(result).toMatchObject({ uri: 'file:///img', blob: 'data' })
        })

        it('returns blob resource content with mimeType', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockResolvedValueOnce({
                contents: [{ uri: 'file:///img', blob: 'data', mimeType: 'image/png' }]
            })
            const result = await client.readResource('file:///img')
            expect(result).toMatchObject({ uri: 'file:///img', blob: 'data', mimeType: 'image/png' })
        })

        it('throws AgentMCPError when contents is empty', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockResolvedValueOnce({ contents: [] })
            await expect(client.readResource('x')).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('throws AgentMCPError when content has neither text nor blob', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockResolvedValueOnce({ contents: [{ uri: 'x' }] })
            await expect(client.readResource('x')).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('wraps readResource error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.readResource.mockRejectedValueOnce(new Error('fail'))
            await expect(client.readResource('x')).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('listPrompts()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.listPrompts()).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('returns mapped prompts without arguments', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listPrompts.mockResolvedValueOnce({
                prompts: [{ name: 'p1', description: 'A prompt' }]
            })
            const prompts = await client.listPrompts()
            expect(prompts[0]).toMatchObject({ name: 'p1', description: 'A prompt' })
        })

        it('returns mapped prompts with arguments', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listPrompts.mockResolvedValueOnce({
                prompts: [{ name: 'p2', arguments: [{ name: 'topic', description: 'Topic', required: true }] }]
            })
            const prompts = await client.listPrompts()
            expect(prompts[0]?.arguments?.[0]).toMatchObject({ name: 'topic', required: true })
        })

        it('returns cached result on second call', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listPrompts.mockResolvedValue({ prompts: [] })
            await client.listPrompts()
            await client.listPrompts()
            expect(mockInternalClient.listPrompts).toHaveBeenCalledTimes(1)
        })

        it('wraps listPrompts error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.listPrompts.mockRejectedValueOnce(new Error('fail'))
            await expect(client.listPrompts()).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('getPrompt()', () => {
        it('throws AgentMCPError when not connected', async () => {
            const client = new MCPClient('s', stdioConfig())
            await expect(client.getPrompt('p')).rejects.toBeInstanceOf(AgentMCPError)
        })

        it('joins text content messages with newline', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.getPrompt.mockResolvedValueOnce({
                messages: [{ content: { type: 'text', text: 'Part 1' } }, { content: { type: 'text', text: 'Part 2' } }]
            })
            const result = await client.getPrompt('p')
            expect(result).toBe('Part 1\nPart 2')
        })

        it('handles string content messages', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.getPrompt.mockResolvedValueOnce({
                messages: [{ content: 'plain text' }]
            })
            const result = await client.getPrompt('p')
            expect(result).toBe('plain text')
        })

        it('filters out non-text content parts', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.getPrompt.mockResolvedValueOnce({
                messages: [{ content: { type: 'image', data: 'img' } }]
            })
            const result = await client.getPrompt('p')
            expect(result).toBe('')
        })

        it('passes args to the underlying call', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.getPrompt.mockResolvedValueOnce({ messages: [] })
            await client.getPrompt('p', { topic: 'testing' })
            expect(mockInternalClient.getPrompt).toHaveBeenCalledWith({ name: 'p', arguments: { topic: 'testing' } })
        })

        it('wraps getPrompt error in AgentMCPError', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client)
            mockInternalClient.getPrompt.mockRejectedValueOnce(new Error('fail'))
            await expect(client.getPrompt('p')).rejects.toBeInstanceOf(AgentMCPError)
        })
    })

    describe('getCapabilities() after connect', () => {
        it('reflects server capabilities', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(
                client,
                { name: 'srv', version: '1' },
                {
                    tools: { listChanged: true },
                    resources: { subscribe: true, listChanged: false },
                    prompts: { listChanged: false },
                    logging: {}
                }
            )
            const caps = client.getCapabilities()
            expect(caps?.hasTools).toBe(true)
            expect(caps?.toolsListChanged).toBe(true)
            expect(caps?.hasResources).toBe(true)
            expect(caps?.resourcesSubscribe).toBe(true)
            expect(caps?.hasPrompts).toBe(true)
            expect(caps?.hasLogging).toBe(true)
        })

        it('returns false for capabilities not in server caps', async () => {
            const client = new MCPClient('s', stdioConfig())
            await connectClient(client, { name: 'srv', version: '1' }, {})
            const caps = client.getCapabilities()
            expect(caps?.hasTools).toBe(false)
            expect(caps?.hasResources).toBe(false)
            expect(caps?.hasPrompts).toBe(false)
        })

        it('defaults to an empty capabilities object when the server reports none', async () => {
            const client = new MCPClient('s', stdioConfig())
            mockInternalClient.connect.mockResolvedValueOnce(undefined)
            mockInternalClient.getServerVersion.mockReturnValue({ name: 'srv', version: '1' })
            mockInternalClient.getServerCapabilities.mockReturnValue(undefined)
            await client.connect()
            const caps = client.getCapabilities()
            expect(caps?.hasTools).toBe(false)
        })

        it('defaults version to "unknown" when the server version has no version field', async () => {
            const client = new MCPClient('s', stdioConfig())
            mockInternalClient.connect.mockResolvedValueOnce(undefined)
            mockInternalClient.getServerVersion.mockReturnValue({ name: 'srv' })
            mockInternalClient.getServerCapabilities.mockReturnValue({})
            await client.connect()
            const caps = client.getCapabilities()
            expect(caps?.version).toBe('unknown')
        })
    })
})
