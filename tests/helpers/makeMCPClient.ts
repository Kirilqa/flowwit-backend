import {
    MCP_SERVER_STATUS,
    MCPCallToolResult,
    MCPClientInterface,
    MCPPrompt,
    MCPResource,
    MCPResourceContent,
    MCPServerCapabilities,
    MCPServerConfig,
    MCPServerConfigRepositoryInterface,
    MCPServerStatus,
    MCPToolDefinition
} from '@mcp'

export type MCPClientMock = {
    callTool: jest.Mock<Promise<MCPCallToolResult>, [string, Record<string, unknown>]>
    getPrompt: jest.Mock<Promise<string>, [string, (Record<string, string> | undefined)?]>
    readResource: jest.Mock<Promise<MCPResourceContent>, [string]>
    connect: jest.Mock<Promise<void>, []>
    disconnect: jest.Mock<Promise<void>, []>
    onConnect: jest.Mock<void, [() => void]>
    onDisconnect: jest.Mock<void, [() => void]>
    getStatus: jest.Mock<MCPServerStatus, []>
    getCapabilities: jest.Mock<MCPServerCapabilities | null, []>
    listTools: jest.Mock<Promise<Array<MCPToolDefinition>>, []>
    listResources: jest.Mock<Promise<Array<MCPResource>>, []>
    listPrompts: jest.Mock<Promise<Array<MCPPrompt>>, []>
} & MCPClientInterface

export function makeMCPClient(alias = 'test-client'): MCPClientMock {
    const callTool = jest
        .fn<Promise<MCPCallToolResult>, [string, Record<string, unknown>]>()
        .mockResolvedValue({ content: [], isError: false })

    const getPrompt = jest.fn<Promise<string>, [string, (Record<string, string> | undefined)?]>().mockResolvedValue('')

    const readResource = jest.fn<Promise<MCPResourceContent>, [string]>().mockResolvedValue({ uri: '', text: '' })

    return {
        alias,
        callTool,
        getPrompt,
        readResource,
        connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        onConnect: jest.fn(),
        onDisconnect: jest.fn(),
        getStatus: jest.fn().mockReturnValue(MCP_SERVER_STATUS.CONNECTED),
        getCapabilities: jest.fn().mockReturnValue(null),
        getConfig: jest.fn().mockReturnValue({ name: 'test', type: 'stdio', command: 'test' }),
        getServerInfo: jest.fn().mockResolvedValue({ name: 'test', version: '1.0' }),
        listTools: jest.fn().mockResolvedValue([]),
        listResources: jest.fn().mockResolvedValue([]),
        listPrompts: jest.fn().mockResolvedValue([])
    }
}

export function makeMCPServerConfigRepository(
    configs: Array<MCPServerConfig> = []
): MCPServerConfigRepositoryInterface {
    const map = new Map(configs.map(config => [config.name, config]))
    return {
        findAll: jest.fn(() => Promise.resolve([...map.values()])),
        findById: jest.fn((name: string) => Promise.resolve(map.get(name) ?? null)),
        create: jest.fn((config: MCPServerConfig) => {
            map.set(config.name, config)
            return Promise.resolve(config)
        }),
        update: jest.fn((name: string, patch: Partial<MCPServerConfig>) => {
            const existing = map.get(name)
            if (existing === undefined) return Promise.reject(new Error(`MCP server "${name}" not found`))
            const updated = { ...existing, ...patch } as MCPServerConfig
            map.set(name, updated)
            return Promise.resolve(updated)
        }),
        delete: jest.fn((name: string) => {
            map.delete(name)
            return Promise.resolve()
        }),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}
